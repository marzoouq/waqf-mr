## التحقق الجنائي من تقرير البصمة

فحصت كل بند فعلياً مقابل الكود. النتيجة: **5 بنود حقيقية تحتاج إصلاحاً جراحياً**، و4 بنود أرفضها لأنها آراء معمارية أو تتعارض مع قرار موثّق في الذاكرة.

---

### بنود صحيحة سأنفّذها

| # | الادعاء | التحقق |
|---|---|---|
| 1 | `register-verify` يتجاهل خطأ insert في `webauthn_credentials` ويرجع `verified: true` كذباً | **صحيح** — `register-verify.ts:60-67` يستدعي `insert` بدون فحص `error`، ثم الواجهة تكتب `BIOMETRIC_ENABLED=true` في `useWebAuthnRegister.ts:79`. |
| 2 | فشل إنشاء challenge لا يُفحص → `challenge_id: null` | **صحيح** في `register-options.ts:51-55` و `auth-options.ts:34-37` — كلاهما يستخدم `insertedChallenge?.id || null` دون فحص `error`. |
| 3 | `residentKey: "preferred"` يكسر تدفق passkey بلا اسم مستخدم | **صحيح** — `auth-options.ts:29-32` لا يرسل `allowCredentials` (تدفق discoverable كامل)، لكن `register-options.ts:43-47` يستخدم `residentKey: "preferred"` و `requireResidentKey: false`. لا تطابق بين التسجيل والمصادقة → بعض الـ authenticators لا تنشئ passkey discoverable فيفشل الدخول. |
| 4 | `userVerification: "preferred"` رغم وعد الواجهة بـ"بصمة" | **صحيح** في كلا الـ options. لا قيمة أمنية للبصمة إن قبل authenticator مجرد presence. |
| 5 | رسائل خطأ السيرفر تضيع | **صحيح جزئياً** — `useWebAuthnAuth.ts:56-59` و `useWebAuthnRegister.ts:73-77` يعرضان رسالة عامة عند `!result?.verified` متجاهلَين `result.error` الذي يرسله السيرفر (مثل "بيانات الاعتماد غير موجودة"، "التحدي منتهي الصلاحية"). |

---

### بنود أرفضها (مع التبرير)

| # | الادعاء | سبب الرفض |
|---|---|---|
| الزر يعتمد على `localStorage` | **قرار موثّق** في `src/constants/storageKeys.ts:43-46` وفي ذاكرة المشروع `mem://auth/biometric-webauthn-implementation`: المؤشر مقصود لتجنّب استدعاءات شبكة من شاشة `/auth` العامة قبل المصادقة. ليس مصدر صلاحية أمنية. الإصلاح الحقيقي للأخطاء الأخرى (رسائل واضحة، رفض false-positive في register-verify) يحلّ تجربة "زر يظهر بلا credential". |
| سباق claim للتحدي في `auth-verify` | الكود **بالفعل** ذرّي: `update ... is('user_id', null)` على PK يكفل أن طلباً واحداً فقط ينجح. الحذف اللاحق على `id` آمن. الادعاء بـ"عدم فحص الصفوف المتأثرة" نظري — verifyAuthenticationResponse يفشل بنفسه عند إعادة الاستخدام لاختلاف counter. |
| Magic Link لإصدار الجلسة | نمط Supabase معتمد ومذكور بوضوح في الذاكرة، خارج نطاق التقرير. |
| `platformAuthenticatorIsAvailable` | تحسين UX، ليس خطأ. الكود الحالي يكشف الفشل عبر استثناء `startAuthentication`. |

---

## خطة الإصلاح الجراحية

### Edge Functions (تنشر تلقائياً)

**1. `supabase/functions/webauthn/handlers/register-options.ts`**
- تغيير `authenticatorSelection`:
  ```
  userVerification: "required",
  residentKey: "required",
  requireResidentKey: true,
  ```
- فحص `error` من insert التحدي، وإرجاع 500 برسالة عربية واضحة عند الفشل.

**2. `supabase/functions/webauthn/handlers/auth-options.ts`**
- تغيير `userVerification: "required"`.
- فحص `error` من insert التحدي وإرجاع 500 عند الفشل.

**3. `supabase/functions/webauthn/handlers/register-verify.ts`**
- التقاط `{ error: insertError }` من insert الـ credential.
- عند الفشل: تسجيل الخطأ + إرجاع 500 برسالة "فشل حفظ بيانات البصمة" **بدون** حذف التحدي ولا إرجاع `verified: true`.

### الواجهة

**4. `src/hooks/auth/biometric/useWebAuthnAuth.ts`**
- عند `!result?.verified`: استخدام `result?.error` إن وُجد بدلاً من الرسالة العامة (fallback يبقى).
- نفس المعالجة عند `!result.access_token`.

**5. `src/hooks/auth/biometric/useWebAuthnRegister.ts`**
- عند `!result?.verified`: استخدام `result?.error` إن وُجد.
- **مهم**: لا نكتب `BIOMETRIC_ENABLED=true` ولا نستدعي `setIsEnabled(true)` إلا بعد `result.verified === true` (هذا محقق فعلاً لكن سيُحفظ بعد الإصلاح #3 بشكل صحيح).

---

## ما لن أمسّه

- `BiometricLoginButton.tsx` — السلوك مقصود وموثّق.
- `useWebAuthn.ts` / `useWebAuthnManage.ts` — لا علاقة بالأخطاء.
- `AuthContext.tsx` / `ProtectedRoute.tsx` — محمية بقواعد المشروع.
- آلية Magic Link لإصدار الجلسة في `auth-verify` — خارج النطاق.
- جدول `webauthn_credentials` و RLS — لا تغيير على الـ schema.

## نقاط التحقق بعد التنفيذ

1. تشغيل اختبارات `src/hooks/auth/biometric/useWebAuthn.test.ts` للتأكد من عدم كسر التغطية الموجودة.
2. اختبار يدوي: تسجيل بصمة جديدة على جهاز يدعم passkey discoverable → نجاح + ظهور credential في DB.
3. اختبار سلبي: محاكاة فشل insert (مثلاً بصمة موجودة → unique constraint) يجب أن يرفع 500 ولا يضع localStorage.
4. اختبار رسائل: إعادة استخدام challenge قديم يجب أن يعرض "التحدي منتهي الصلاحية" بدل "فشل التحقق".
