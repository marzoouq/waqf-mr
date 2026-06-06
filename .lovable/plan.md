
# تحقق وإصلاح فحص HIBP في التسجيل/تسجيل الدخول

## النتائج الحرجة من المراجعة

عند فحص الكود الفعلي وجدت **فجوتين** تجعلان طلب "ظهور رسالة واضحة للمستخدم عند رفض HIBP" غير قابل للتحقق حالياً:

### الفجوة 1 — `guard-signup` يتجاوز HIBP فعلياً
`supabase/functions/guard-signup/index.ts` يستخدم `supabaseAdmin.auth.admin.createUser(...)` (سطر 111). **الـ Admin API يتجاوز فحوصات GoTrue للمستخدم العادي بما فيها HIBP**. أي حتى مع `password_hibp_enabled: true` المُفعَّل في المصادقة، التسجيل عبر هذا الـ endpoint **لن يُرفض** لكلمة مرور مُسرَّبة.

### الفجوة 2 — أي خطأ من `createUser` يتحوّل لرسالة عامة
سطر 117-123 في `guard-signup`:
```ts
if (createError) {
  return new Response(JSON.stringify({ error: "تعذر إتمام التسجيل" }), { status: 400, ... });
}
```
حتى لو وصلتنا رسالة HIBP من GoTrue (في `signInWithPassword` لتغيير المرور مثلاً)، فالمستخدم يرى نصاً عاماً لا يميّز سبب الرفض.

### حالة `safeErrorMessage` لتسجيل الدخول/إعادة التعيين
- يلتقط `password + weak` ويعيد: «كلمة المرور ضعيفة أو غير متطابقة…»
- لا يلتقط مصطلحات HIBP الفعلية من GoTrue: `pwned`, `has been found in a data breach`, `compromised`, `leaked` → رسالة افتراضية غامضة.

## الخطة

### 1) فحص HIBP داخل `guard-signup` (مصدر الحقيقة)
بما أن Admin API لا يطبّقه، نضيف فحصاً صريحاً قبل `createUser`:
- حساب SHA-1 لكلمة المرور (Web Crypto متاحة في Deno).
- استدعاء `https://api.pwnedpasswords.com/range/{first5}` مع header `Add-Padding: true`.
- إن وُجد suffix في النتيجة → رد `400` بـ:
  ```json
  { "error": "كلمة المرور هذه ظهرت في تسريبات بيانات معروفة. يرجى اختيار كلمة مرور مختلفة." }
  ```
- timeout قصير (3 ثوانٍ) + fail-open (نسمح بالمرور إن فشل HIBP خدمياً) حتى لا نوقف التسجيل عند انقطاع API الخارجي.

### 2) تمرير أخطاء `createUser` المعروفة بدل ابتلاعها
في `guard-signup`، نُبقي رسالة عامة افتراضياً لكن نُميّز الحالات الآمنة للإبلاغ:
- `email already registered` → «هذا البريد الإلكتروني مسجل بالفعل»
- `weak password / pwned / breach` → نفس رسالة HIBP أعلاه
- خلاف ذلك → الرسالة العامة الحالية (بدون كشف تفاصيل).

### 3) توسيع `safeErrorMessage.ts` (لمسار تغيير/إعادة تعيين المرور)
يغطي مسارات `useChangePassword` و`useResetPassword` التي تستدعي `supabase.auth.updateUser` مباشرة (حيث HIBP فعّال أصلاً):
```ts
if (msg.includes('pwned') || msg.includes('breach') || msg.includes('compromised') || msg.includes('leaked')) {
  return 'كلمة المرور هذه ظهرت في تسريبات بيانات معروفة. يرجى اختيار كلمة مرور مختلفة.';
}
```
يُضاف قبل فرع `password + weak` ليطغى عليه.

### 4) اختبار يدوي في المعاينة عبر المتصفح
بعد التطبيق:
- **تسجيل جديد** بكلمة معروفة التسريب (`Password123`) → توقع رفض + رسالة HIBP العربية أسفل الحقل/في التنبيه.
- **تسجيل جديد** بكلمة قوية فريدة → توقع نجاح + رسالة «يرجى تأكيد بريدك الإلكتروني…».
- **تغيير كلمة المرور** لمستخدم موجود إلى `Password123` (إن أمكن دون كسر حساب الناظر) → توقع رفض من GoTrue مباشرة + ترجمة عربية واضحة.
- **تسجيل دخول** عادي بحساب موجود → غير متأثر (HIBP لا يُفعَّل عند login).

### 5) اختبارات وحدة قصيرة
- `guard-signup/index.test.ts`: حالة pwned تُعيد 400 ورسالة HIBP.
- `safeErrorMessage.test.ts` (إن وُجد، وإلا نضيف): إدخال يحوي `pwned` يعيد الرسالة الجديدة.

## ملفات ستتغيّر
- `supabase/functions/guard-signup/index.ts` (إضافة HIBP + تحسين أخطاء createUser)
- `src/utils/format/safeErrorMessage.ts` (فرع جديد)
- `supabase/functions/guard-signup/index.test.ts` (حالة اختبار جديدة)
- ملف اختبار لـ `safeErrorMessage` (إن لم يكن موجوداً)

## ملفات لن تُمسّ
- `AuthContext.tsx`, `LoginForm.tsx`, `SignupForm.tsx` (المنطق سليم، الرسائل تأتي من المصدر)
- `supabase/config.toml`, `client.ts`, `types.ts`, `.env`
- إعداد HIBP في لوحة المصادقة (مُفعَّل بالفعل ويبقى — يحمي مسار `updateUser`)

## الخطر والتكلفة
- استدعاء HIBP خارجي يضيف ~100-300ms على التسجيل (مقبول).
- Fail-open يمنع تعطّل التسجيل عند انقطاع HIBP لكن يُسجَّل تحذير في logs.
- لا تأثير على المستخدمين الحاليين (الفحص فقط عند إنشاء/تغيير كلمة مرور).
