
# إصلاح صفحة المستخدمين الفارغة (0 مستخدمين)

## السبب الجذري

وظيفة `admin-manage-users` مفقودة من ملف `supabase/config.toml`. بدون تعيين `verify_jwt = false`، نظام التحقق التلقائي من Supabase (signing-keys) يتدخل ويمنع وصول header المصادقة (`Authorization`) إلى كود الوظيفة.

**الدليل من سجلات الإنتاج:**
- كل طلبات POST ترجع `401`
- الوظيفة ترد بـ `"No authorization header"` (من كود الوظيفة نفسه، سطر 18)
- هذا يعني أن header المصادقة تم تجريده أو رفضه قبل وصوله للكود

**ملف config.toml الحالي:**
```text
project_id = "nuzdeamtujezrsxbvpfi"

[functions.check-contract-expiry]
verify_jwt = false
```

`admin-manage-users` غير موجودة -- وكذلك باقي الوظائف.

## الإصلاح المطلوب

### الخطوة الوحيدة: تحديث `supabase/config.toml`

إضافة جميع وظائف Edge Functions بإعداد `verify_jwt = false` (لأن التحقق يتم يدوياً داخل كود كل وظيفة):

```toml
project_id = "nuzdeamtujezrsxbvpfi"

[functions.admin-manage-users]
verify_jwt = false

[functions.check-contract-expiry]
verify_jwt = false

[functions.ai-assistant]
verify_jwt = false

[functions.auto-expire-contracts]
verify_jwt = false

[functions.generate-invoice-pdf]
verify_jwt = false

[functions.guard-signup]
verify_jwt = false

[functions.lookup-national-id]
verify_jwt = false
```

### لماذا هذا آمن؟

كل وظيفة تتحقق يدوياً من المصادقة في كودها عبر:
1. فحص وجود header المصادقة
2. التحقق من هوية المستخدم عبر `getUser()`
3. التحقق من دور المستخدم (admin) من جدول `user_roles`

تعطيل `verify_jwt` التلقائي ضروري لأن نظام signing-keys الجديد لا يتوافق مع الطريقة القديمة.

## الملفات المتأثرة

1. `supabase/config.toml` -- إضافة جميع الوظائف بـ `verify_jwt = false`

## النتيجة المتوقعة

- صفحة إدارة المستخدمين تعرض الـ 14 مستفيد + باقي المستخدمين
- جميع وظائف Edge Functions الأخرى تعمل بشكل صحيح
