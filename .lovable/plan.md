## التشخيص الجنائي

### المشكلة 1: `workbox: non-precached-url: index.html`
**السبب الجذري** — في `vite.config.ts`:
- `globPatterns` يستثني HTML بالكامل: `['**/*.{js,css,ico,png,svg,woff2,ttf}']` (لا `html`).
- لكن `vite-plugin-pwa` يولّد افتراضياً `navigateFallback: 'index.html'` ويستدعي `createHandlerBoundToURL('index.html')` داخل `sw.js`.
- النتيجة: workbox يبحث عن `index.html` في precache فلا يجده ويرمي `non-precached-url`.
- التعليق في الملف يقرّ أن `index.html` مُستبعد عمداً ويُخدم عبر `NetworkFirst` runtime، لكن `navigateFallback` لم يُعطَّل.

**الحل الصريح** — في `vite.config.ts`، إضافة سطر واحد داخل `workbox`:
```ts
navigateFallback: null,
```
هذا يوقف توليد `createHandlerBoundToURL` تماماً، ويترك التنقل تحت `runtimeCaching` `NetworkFirst` كما هو مقصود في التعليق الموجود. لا حاجة لتغيير `globPatterns` ولا إضافة HTML للـ precache (لتفادي تكرار العطل الذي كان يحدث مع كل بمب نسخة).

### المشكلة 2: 13 حقل نموذج بدون `name`
**التشخيص** — على `/auth`، كل الـ `<Input/>` لديها `id` فقط. Chromium DevTools (autofill heuristic) يحذّر عندما يغيب `name` حتى مع وجود `id`، لأن `name` هو ما يستخدمه autofill ومحركات إدارة كلمات المرور.
- إضافةً لذلك: `LoginMethodSelector` يستخدم `RadioGroup` بدون تمرير `name` إليه؛ Radix يولّد input radio مخفياً يفتقر اسماً.
- العدّاد 13 ≈ مجموع: حقول signin (email/nid/password بـ idSuffix) + signup (email/password) + reset (email) + Radix hidden radios + تكرارات re-mount.

**الحل الصريح** — إضافة `name` و `autoComplete` لكل حقل في:

1. `src/components/auth/login/EmailField.tsx`
   ```tsx
   name="email"
   autoComplete="email"
   ```
2. `src/components/auth/login/NationalIdField.tsx`
   ```tsx
   name="national_id"
   inputMode="numeric"
   autoComplete="username"
   ```
3. `src/components/auth/login/PasswordField.tsx`
   ```tsx
   name="password"
   // autoComplete موجود
   ```
4. `src/components/auth/SignupForm.tsx` (الحقلان)
   ```tsx
   name="email"  // للحقل الأول
   name="new-password"  // للحقل الثاني
   ```
5. `src/components/auth/ResetPasswordForm.tsx`
   ```tsx
   name="email"
   autoComplete="email"
   ```
6. `src/components/auth/login/LoginMethodSelector.tsx`
   ```tsx
   <RadioGroup name={`login_method${idSuffix}`} ... />
   ```

## نطاق التعديل
- ملف واحد للـ PWA: `vite.config.ts` (سطر واحد).
- ستة ملفات للنماذج: كل واحد سطر/سطرين فقط (إضافة props بدون تغيير منطق).

## خارج النطاق
- لا تعديل على `AuthContext`/`ProtectedRoute`/`SecurityGuard` ولا أي ملف محمي.
- لا تعديل على service worker bootstrap ولا `SwUpdateBanner`.
- لا تغيير على schema/RLS/Edge Functions.

## التحقق بعد التنفيذ
1. `npx tsc --noEmit` → 0 أخطاء.
2. `npx eslint .` → 0 errors.
3. `bunx vitest run src/components/auth src/lib/pwaBootstrap.test.ts` → نجاح كامل (الاختبارات تتحقق من سلوك التسجيل/التحقق، لا الـ `name` attribute).
4. `npx vite build` → فحص أن `sw.js` المولّد لا يحوي `createHandlerBoundToURL` لـ `index.html`:
   ```bash
   grep -c "createHandlerBoundToURL" dist/sw.js
   ```
   يجب أن يكون 0.

عند أي فشل أوقف التنفيذ وأبلّغك قبل المتابعة.