# تسوية التقريرين — نتائج تحقق مباشرة على DB و Git

فحصت البنود المتنازع عليها مباشرة (سياسات storage، GRANTS الفعلية، الفهارس، تتبّع `.env`). الحكم النهائي بالأدلة:

## 🔴 P0 حقيقي (اكتُشف الآن ولم يرد في التقريرين)

### 1. `.env` متعقّب في git
```
$ git ls-files | grep -E '^\.env'
.env
.env.example
```
- التقرير الأخير قال «.env غير متعقّب» — **خطأ**. الملف داخل الفهرس فعلاً.
- `.gitignore` يحتوي `.env` لكن التتبّع سابق لإضافة السطر، فالاستبعاد لا يسري.
- **الأثر**: أي secret داخل `.env` مكشوف في تاريخ git.
- **الإجراء**: `git rm --cached .env` + تدوير أي مفتاح ظهر فيه (بعد فحص محتواه بأمان).

## 🟠 P1 مؤكَّد

### 2. 10 دوال cron قابلة للاستدعاء من `authenticated`
تحقّق `has_function_privilege`:
| دالة | authenticated | anon |
|---|:-:|:-:|
| `cleanup_expired_challenges` | ✅ منح | ❌ |
| `cleanup_pending_invoice_chain` | ✅ منح | ❌ |
| `cron_archive_old_access_logs` | ✅ منح | ❌ |
| `cron_auto_expire_contracts` | ✅ منح | ❌ |
| `cron_check_contract_expiry` | ✅ منح | ❌ |
| `cron_check_late_payments` | ✅ منح | ❌ |
| `cron_check_slow_queries` | ✅ منح | ❌ |
| `cron_check_zatca_cert_expiry` | ✅ منح | ❌ |
| `cron_cleanup_old_notifications` | ✅ منح | ❌ |
| `cron_update_overdue_invoices` | ✅ منح | ❌ |
| `move_to_dlq` | ❌ | ❌ |
| `auto_revoke_anon_execute` | ❌ | ❌ |

- التقرير المُصحّح صحيح هنا: 10 دوال maintenance (لا 12) تحتاج `REVOKE EXECUTE FROM authenticated, PUBLIC`.
- المخاطرة: مستخدم مصادَق يستطيع تشغيل أرشفة/تنظيف/انتهاء عقود يدوياً.

### 3. CORS silent-block (P1 خفيف)
- `getAllowedOrigin()` يُرجع سلسلة فارغة لأصل غير مسموح → المتصفح يرفض بلا log.
- الإنتاج (`waqf-wise.net`, preview, `www`) يعمل — تحقّق من `docs/api/cors-verification.md`.
- **الإجراء**: إضافة `logger.warn('CORS reject', { origin })` في `_shared/cors.ts`.

## ✅ إيجابيات كاذبة مؤكَّدة (التقرير الأول كان مخطئاً)

| بند | الحقيقة |
|---|---|
| P0-1 سياسة `Authenticated users can view invoices` | **غير موجودة**. 7 سياسات فقط، كلها admin/accountant |
| P1-4 فهارس `access_log` | `idx_access_log_user_event_created` موجود |
| P1-5 فهرس `payment_invoices(fiscal_year_id, due_date)` | مفقود لكن الجدول 5 صفوف — غير عاجل |
| P2-7 فهرس `contracts(fiscal_year_id)` | موجود |
| P2-8 فهرس `messages` unread | `idx_messages_is_read_sender` موجود مع `WHERE is_read=false` |

## 🟡 P2 صحيح

### 4. `app_settings` staleTime
- 17,085 قراءة مسجّلة. `STALE_STATIC = 5 دقائق` حالياً في `src/lib/queryStaleTime.ts`.
- رفعه إلى 15 دقيقة يخفض الحمل بلا أثر على UX (الإعدادات نادرة التغيّر).

## 📋 خطة التنفيذ المقترحة (بعد موافقتك)

**موجة P0 (قبل النشر — إلزامي):**
1. `git rm --cached .env` + مراجعة محتوى `.env` معك لتحديد ما يحتاج تدوير.

**موجة P1 (قبل النشر — موصى بشدة):**
2. Migration واحد: `REVOKE EXECUTE ON FUNCTION ... FROM authenticated, PUBLIC` للـ10 دوال أعلاه.
3. تعديل `supabase/functions/_shared/cors.ts` — إضافة `console.warn` (Deno) عند رفض origin.

**موجة P2 (بعد النشر — تحسين):**
4. رفع `STALE_STATIC` من 5 إلى 15 دقيقة في `src/lib/queryStaleTime.ts`.
5. (اختياري لاحقاً) فهرس `payment_invoices(fiscal_year_id, due_date)` حين ينمو الجدول.

## ❌ ما لن أفعله دون إذن إضافي
- لن أعرض محتوى `.env` هنا (سياسة الأسرار).
- لن أعدّل أي كود قبل موافقتك على هذه الخطة.
- لن ألمس الدوال الـ66 الأخرى SECURITY DEFINER (RPCs مشروعة).
