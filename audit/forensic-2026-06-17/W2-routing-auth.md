# W2 — Routing & Auth (الفحص الجنائي الثاني — 2026-06-17)

25 findings. 4 🔴 / 8 🟠 / 13 🟡.

## 🔴 CRITICAL
- **F-05** `useAuthListener.ts:132` — سباق getUser/INITIAL_SESSION، dedup غير ذرّي → ضبط `lastUserIdRef` قبل getSession.
- **F-08** `useAuthListener.ts:140` — `getSession()` بعد `getUser()` قد يُرجع توكن مُلغى من localStorage → الاعتماد على `currentSession` من المستمع.
- **F-13** `useWebAuthnAuth.ts:45` — access/refresh tokens في body الاستجابة (XSS vector) → نقل إلى HttpOnly cookie من Edge.
- **F-18** `useRoleRedirect.ts:19` — `?from=` غير مُستهلك بعد تسجيل الدخول، يُكسر redirect-back.
- **F-23** `useAuthListener.ts:140` — تكرار `getSession()` antipattern.

## 🟠 HIGH
- F-04 `/dashboard/comparison` تعليق مضلِّل في adminRoutes.tsx:52.
- F-06 `ProtectedRoute.tsx:71` — spinner بلا timeout لو فشل جلب الدور.
- F-07 `useAuthListener.ts:88` — dedup يُسقط setSession في TOKEN_REFRESHED.
- F-09 `useAuthPage.ts:29` — `reason=session_expired` غير معالج.
- F-14 `useWebAuthnAuth.ts:16` — `auth-options` بلا session check → user enumeration.
- F-15 `useWebAuthnRegister.ts:59` — لا تحقق من `challenge_id` قبل startRegistration.
- F-19 `RequirePermission.tsx:39` — fallback waqif يذهب لـ `/beneficiary` ثم `/unauthorized` (double redirect).
- F-24 `useWebAuthnRegister.ts:26` — `getUser()` زائد، الـ user متاح من AuthContext.

## 🟡 LOW
F-01..F-03, F-10..F-12, F-16, F-17, F-20..F-22, F-25 — تحسينات حماية وتجميل.

## ✅ نظيف
لا تخزين خام لدور أو توكن في localStorage (فقط علم `BIOMETRIC_ENABLED` كـ UI hint).
