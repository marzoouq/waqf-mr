

# خطة إصلاح مشكلة فتح الفواتير - تحليل جنائي

## نتائج التحقيق الجنائي

### الاختبار المباشر
تم استدعاء الوظيفة مباشرة وكانت النتيجة:
```
HTTP 404: {"code":"NOT_FOUND","message":"Requested function was not found"}
```
الوظيفة **غير موجودة** من منظور البوابة (Gateway).

### السبب الجذري
ملف `supabase/config.toml` لا يحتوي على تسجيل لوظيفة `serve-invoice`. الوظائف المسجلة حالياً هي:
- `admin-manage-users`
- `lookup-national-id`
- `ai-assistant`
- `auto-expire-contracts`

بدون التسجيل، البوابة ترفض الطلب بـ 404 قبل أن يصل الكود أصلاً.

### الدليل من السجلات
سجلات الوظيفة تُظهر فقط أحداث إقلاع (boot) ولا يوجد أي طلب وصل فعلياً — مما يؤكد أن الحظر يحدث على مستوى البوابة.

### مشكلة ثانوية
رؤوس CORS في الوظيفة ناقصة — ينقصها رؤوس عميل Supabase المطلوبة.

---

## خطوات الإصلاح

### الخطوة 1: تسجيل الوظيفة في config.toml
إضافة القسم التالي:
```toml
[functions.serve-invoice]
verify_jwt = false
```
`verify_jwt = false` ضروري لأن التحقق من الهوية يتم يدوياً داخل الكود (عبر `getUser` و `user_roles`).

### الخطوة 2: تحديث رؤوس CORS
تحديث `Access-Control-Allow-Headers` لتشمل جميع الرؤوس التي يرسلها عميل المتصفح:
```
authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version
```

### الخطوة 3: إعادة نشر الوظيفة واختبارها
نشر الوظيفة تلقائياً ثم اختبارها مباشرة للتأكد من عملها.

---

## الملفات المتأثرة
- `supabase/config.toml` — إضافة تسجيل الوظيفة
- `supabase/functions/serve-invoice/index.ts` — تحديث رؤوس CORS فقط (سطر واحد)

## النتيجة المتوقعة
بعد التسجيل وتحديث CORS، ستعمل الفواتير عبر المسار:
```
المتصفح → Edge Function (serve-invoice) → التحقق من الهوية → تحميل الملف من التخزين → إرجاع blob URL
```
بدون أي حظر من Chrome لأن الطلب يمر عبر نطاق التطبيق نفسه.
