# خطة تسريع التطبيق — مُراجَعة بعد فحص الواقع

## ما تأكد من الفحص العميق

| البند | الواقع | الحكم |
|------|-------|------|
| Lazy routes | ✅ `lazyWithRetry` على كل صفحة admin | لا حاجة لتغيير |
| `app_settings` staleTime | ✅ 5 دقائق بالفعل + gcTime 30د | لا حاجة لتغيير |
| `notifications` فهرس | ⚠️ `(user_id, is_read, created_at DESC)` — `is_read` في الوسط يمنع استخدام sort للاستعلامات بدون فلتر `is_read` | يحتاج فهرس جديد |
| `access_log` فهارس | ❌ 3 فهارس مفردة فقط، لا composite | فهرس مركّب مفقود |
| `audit_log` فهارس | ❌ لا فهرس على `created_at` وحده | فهرس مفقود |
| DB Health | Memory 56%، Disk 63%، Connections 7/60 | لا داعي لترقية compute |
| Rolled-back tx | 1,176,851 منذ التشغيل | **مؤشر تحقيق منفصل** (RLS rejects؟) |

## الخطة المُحدّثة

### الموجة 1 — فهارس DB (Migration واحدة)

```sql
-- access_log: يخدم الاستعلام الأبطأ (22.2s إجمالي)
CREATE INDEX IF NOT EXISTS idx_access_log_user_event_created
  ON public.access_log (user_id, event_type, created_at DESC);

-- audit_log: قراءة عامة بترتيب زمني (12.5s إجمالي)
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at
  ON public.audit_log (created_at DESC);

-- notifications: فهرس مرتب لـ created_at بدون اعتراض is_read (7.4s)
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);
```

**ملاحظات تقنية:**
- لا `CONCURRENTLY` (يفشل داخل migration transaction).
- الفهارس الموجودة تبقى — `idx_notifications_user_read_created` ما زال مفيداً لاستعلامات is_read.
- لا تأثير على RLS أو policies أو data.

**القياس:** `EXPLAIN ANALYZE` قبل/بعد على عينة استعلام.

### الموجة 2 — تحقيق منفصل (لا تنفيذ بدون موافقة)
1.176M rolled-back transactions = إشارة قوية لرفضات RLS متكررة أو فشل تحقق. أقترح:
- استعلام `pg_stat_database` للتأكد.
- فحص `access_log` لرصد `event_type='rls_denied'` (إن وُجد).
- مراجعة edge functions للتأكد من معالجة الأخطاء قبل rollback.

### الموجة 3 — Frontend (بعد الموجة 1)
- تشغيل `rollup-plugin-visualizer` (مُثبّت أصلاً) في build لرؤية أكبر chunks.
- مراجعة `vendor-recharts` و `vendor-pdf` — هل تُحمَّل lazy فعلاً؟
- صور: لا توجد صور كبيرة في `src/assets` (المشروع نظيف). لا حاجة لتحويل WebP الآن.

### مالن أفعل
- ❌ لن أرفع compute (لا داعي — memory 56%).
- ❌ لن أعدّل cron الإيميل بدون قرار منتج.
- ❌ لن ألمس staleTime (ضبطه جيد).
- ❌ لن ألمس lazy routes (مُطبَّق).

## التحقق
1. `EXPLAIN ANALYZE` للاستعلام البطيء قبل migration.
2. تطبيق migration.
3. `EXPLAIN ANALYZE` بعد — يجب رؤية Index Scan بدل Seq Scan/Sort.
4. `tsgo + vitest + audit-all` (لا تغيير كود).
5. إعادة `slow_queries` بعد 24h لقياس الأثر الإنتاجي.

---
**اقتراح:** أبدأ بالموجة 1 (فهارس فقط — أثر فوري، صفر مخاطر) ثم نقرر الموجتين 2 و 3 بناء على القياس. موافق؟
