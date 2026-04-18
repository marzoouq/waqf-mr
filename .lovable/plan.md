
## الموجة 10 — تنفيذ الإصلاحات الثلاث (د: كل ما سبق)

بناءً على نتائج الفحص الجنائي العميق المعتمد، سأنفذ المسارات الثلاثة بترتيب الخطورة (الأقل أولاً).

### المرحلة 1 — الإلزامي: حذف migration المكرر

**الدليل**: ملفان متطابقان MD5 (`0d8474fc...`) في `supabase/migrations/`.

- **حذف**: `supabase/migrations/20260318101512_29652d94-*.sql` (الأقدم، اسم غير وصفي)
- **الإبقاء**: `supabase/migrations/20260318102000_fix_safe_views_remove_security_invoker.sql` (الأحدث، اسم وصفي)
- **الخطر**: صفر — الملف الباقي يحتوي SQL متطابق بايت ببايت

### المرحلة 2 — تنظيف models.ts

**الدليل**: 0 ملف يستورد من `@/types/models` مباشرة. كل الاستيرادات عبر `@/types` (barrel) أو `@/types/database` (deprecated shim).

- **تعديل**: `src/types/models.ts` — إضافة JSDoc `@internal` يوضح أنه طبقة داخلية لـ `index.ts` فقط
- **لا حذف**: لأن `index.ts` يُعيد التصدير منه عبر `export * from './models'`
- **لا تغيير في الاستيرادات الخارجية**

### المرحلة 3 — قرار تشغيلي: إعادة جدولة cron

**الدليل**: `cron_check_contract_expiry()` موجودة كـ SQL function لكن غير مجدولة. README يؤكد التعطيل.

**الخيار المختار**: استخدام `cron_check_contract_expiry()` SQL مباشرة (لا edge function) — أبسط وأكثر أماناً.

- **SQL عبر insert tool** (ليس migration — لأنه يحتوي مفاتيح بيئة محددة):
  ```sql
  SELECT cron.schedule(
    'check-contract-expiry-daily',
    '0 6 * * *',  -- 6 صباحاً UTC = 9 صباحاً بتوقيت السعودية
    $$ SELECT public.cron_check_contract_expiry(); $$
  );
  ```
- **تحديث README**: `supabase/functions/check-contract-expiry/README.md` — توضيح أن الجدولة عادت عبر SQL function داخلية (لا edge function)

### الضمانات
- **صفر تغيير** في: schema, RLS, Auth, UI, Edge Functions, types المستخدمة فعلياً
- **TypeScript**: لا تغيير في الأنواع المُستهلكَة → لا حاجة لـ `tsc` (مجرد JSDoc)
- **DB**: استدعاء SQL واحد عبر `cron.schedule` — قابل للتراجع بـ `cron.unschedule`
- **التحقق بعد التنفيذ**: استعلام `SELECT * FROM cron.job WHERE jobname='check-contract-expiry-daily'`

### النطاق الفعلي
- **محذوف**: 1 ملف migration
- **معدَّل**: 2 ملف (`models.ts` JSDoc + README)
- **SQL**: 1 استدعاء `cron.schedule`

### التسليم
1. حذف migration المكرر
2. تحديث `models.ts` بـ JSDoc
3. تحديث `README.md` للـ cron
4. استدعاء SQL عبر insert tool لجدولة cron
5. تأكيد بـ `SELECT FROM cron.job`
6. تقرير ختامي مختصر يُغلق الموجات 1→10
