## تشخيص مشكلة النشر

ثلاث هجرات معلّقة في Test ولم تُنشر على Live لأن إحداها تفشل:

| الهجرة | الوصف | الحالة على Live |
|---|---|---|
| `20260527132751` (Wave 2/3/5) | `NOT NULL` على `fiscal_year_id` + تحسين عرض السندات + فهرس rate_limits | **تفشل** ❌ |
| `20260527144824` | إلغاء صلاحيات `anon` من دوال `SECURITY DEFINER` + تكرار تحسين عرض السندات | آمنة ✅ |
| `20260527153807` | إنشاء طوابير `pgmq` (auth/transactional emails) | آمنة ✅ (الحارس `IF NOT EXISTS` يتخطّاهما لأنهما أُنشئا يدوياً) |

### سبب فشل Wave 2

العمود `payment_invoices.fiscal_year_id` فيه **18 صف NULL** على Live، وكلها فواتير دفعات بـ `due_date` بين `2026-10-25` و `2026-12-30` — أي **بعد** نهاية السنة المالية النشطة (`2025-2026` تنتهي `2026-10-24`). تنتمي هذه الصفوف فعلياً للسنة المالية `2026-2027` التي **لم تُنشأ بعد** في النظام.

الجداول الثلاثة الأخرى (`contracts`, `advance_requests`, `invoices`) فيها 0 NULL — يمكن تطبيق `NOT NULL` عليها بأمان.

## الحل المقترح

### الخيار المُختار: تأجيل `NOT NULL` على `payment_invoices` فقط

نُنشئ هجرة جديدة تستبدل Wave 2 بتطبيق `NOT NULL` على الجداول الثلاثة الآمنة فقط، ونترك `payment_invoices` nullable مؤقتاً حتى ينشئ الناظر السنة المالية `2026-2027` ويُعاد ربط الصفوف الـ 18.

### الخطوات

1. **إنشاء هجرة جديدة** `20260527XXXXXX_fix_publish_blocking.sql` تحتوي:
   - `NOT NULL` على `contracts.fiscal_year_id`, `advance_requests.fiscal_year_id`, `invoices.fiscal_year_id` فقط
   - تخطّي `payment_invoices.fiscal_year_id` مع تعليق `TODO` يوثّق السبب
   - إعادة بقية محتوى Wave 3 و Wave 5 (تحسين العرض + الفهرس) — تنفيذ idempotent عبر `CREATE OR REPLACE` و `CREATE INDEX IF NOT EXISTS`

2. **إفراغ ملف الهجرة الفاشلة** `20260527132751`:
   - استبداله بتعليق `-- superseded by 20260527XXXXXX_fix_publish_blocking.sql` فقط
   - لا يمكن حذف الملف لأنه مُسجّل في تاريخ الهجرات

3. **التحقق قبل النشر**:
   - `pgmq.meta` على Live: الطابوران موجودان ✅ (تأكّدنا)
   - عدّ NULL على الجداول الثلاثة: صفر ✅ (تأكّدنا)
   - cron jobs تعمل بسلام (آخر خطأ قبل 16:17:29) ✅

4. **بعد النشر**: مهمة منفصلة لاحقاً عند الحاجة:
   - إنشاء السنة المالية `2026-2027` من واجهة الناظر
   - هجرة backfill تربط الصفوف الـ 18 بالسنة الجديدة بناءً على `due_date`
   - هجرة `NOT NULL` على `payment_invoices.fiscal_year_id`

### تفاصيل تقنية

- هجرة `27144824` تحتوي على نفس CREATE OR REPLACE للعرض الموجود في Wave 3، لذا تشغيلهما بالترتيب الحالي آمن (idempotent).
- قائمة `authenticated_function_names` في `27144824` تشمل 34 دالة `SECURITY DEFINER` تعمل عبر RLS — إلغاء `anon` آمن لأن هذه الدوال تستدعي `auth.uid()` أو `has_role()`.
- ملف pgmq لا يتأثر بـ bug `pgmq.create()` لأن الحارس `EXISTS` يتخطّى الاستدعاء بالكامل بعد التنفيذ اليدوي السابق.

## النتيجة المتوقعة

النشر التالي ينجح ويُطبّق على Live:
- 3 جداول تكتسب `NOT NULL`
- عرض `disbursement_vouchers_public` يتحوّل إلى `security_invoker = true`
- فهرس `idx_rate_limits_key_window` يُنشأ
- دوال `SECURITY DEFINER` تفقد صلاحية `anon`
- طوابير البريد تظل سليمة دون لمس
