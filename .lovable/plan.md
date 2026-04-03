

# تقرير: مكونات UI تستورد Supabase مباشرة

## النتائج

وجدت **6 ملفات** في `src/components/` و `src/pages/` تستورد `supabase` مباشرة:

### ① ملفات تحتاج نقل المنطق إلى هوكات بيانات

| الملف | نوع الاستخدام | الإجراء المقترح |
|-------|--------------|----------------|
| **`src/pages/Index.tsx`** | `supabase.rpc('get_public_stats')` داخل `useQuery` مضمّن | إنشاء `src/hooks/data/usePublicStats.ts` ونقل الاستعلام إليه |
| **`src/pages/ResetPassword.tsx`** | `supabase.auth.onAuthStateChange` + `supabase.auth.updateUser` | إنشاء `src/hooks/auth/useResetPassword.ts` لتغليف منطق الاسترداد |
| **`src/components/auth/ResetPasswordForm.tsx`** | `supabase.auth.resetPasswordForEmail` داخل onClick | إنشاء `src/hooks/auth/usePasswordResetRequest.ts` |
| **`src/components/auth/LoginForm.tsx`** | `supabase.auth.signInWithPassword` + `supabase.rpc` | إنشاء `src/hooks/auth/useLoginForm.ts` لفصل منطق تسجيل الدخول |
| **`src/components/auth/BiometricLoginButton.tsx`** | `supabase.functions.invoke('webauthn')` + `supabase.auth.setSession` | إنشاء `src/hooks/auth/useBiometricAuth.ts` |

### ② ملف مقبول — لا يحتاج تغيير

| الملف | السبب |
|-------|-------|
| **`src/components/common/ErrorBoundary.tsx`** | Class Component لا يمكنه استخدام hooks. استخدام `supabase.rpc` هنا للتبليغ عن الأخطاء مقبول معمارياً لأنه fire-and-forget ولا يؤثر على UI state. |

---

## خطة التنفيذ (بالترتيب)

### الخطوة 1: `usePublicStats` — نقل من `Index.tsx`
- إنشاء `src/hooks/data/usePublicStats.ts` يحتوي على `useQuery` + استدعاء `supabase.rpc('get_public_stats')`
- تحديث `Index.tsx` لاستيراد الهوك بدلاً من supabase

### الخطوة 2: `useResetPassword` — نقل من `ResetPassword.tsx`
- إنشاء `src/hooks/auth/useResetPassword.ts` يغلّف `onAuthStateChange` + `updateUser`
- تحديث الصفحة لتصبح UI فقط

### الخطوة 3: `usePasswordResetRequest` — نقل من `ResetPasswordForm.tsx`
- إنشاء `src/hooks/auth/usePasswordResetRequest.ts` يغلّف `resetPasswordForEmail`
- تحديث المكون ليستخدم الهوك

### الخطوة 4: `useLoginForm` — نقل من `LoginForm.tsx`
- إنشاء `src/hooks/auth/useLoginForm.ts` لفصل منطق المصادقة (signIn, NID lookup, rate limiting)
- تحديث المكون ليصبح عرض فقط

### الخطوة 5: `useBiometricAuth` — نقل من `BiometricLoginButton.tsx`
- إنشاء `src/hooks/auth/useBiometricAuth.ts` يغلّف WebAuthn flow + setSession
- تحديث المكون

### الخطوة 6: بناء وتشغيل الاختبارات
- التأكد من نجاح `npm run build`
- تشغيل الاختبارات المتعلقة

---

## الملخص

- **5 ملفات** تحتاج إصلاح (نقل supabase إلى hooks)
- **1 ملف** مقبول (ErrorBoundary — class component)
- **5 هوكات جديدة** ستُنشأ
- لا تغيير في السلوك — إعادة هيكلة فقط

