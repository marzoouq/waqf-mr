
# تقرير فحص التطبيق — waqf-mr.lovable.app

## ✅ تم التنفيذ

### 1. إصلاح تحذيرات forwardRef
- لف `AuthProvider` و `FiscalYearProvider` بـ `React.forwardRef`

### 2. إشعار حد السجلات في useCrudFactory
- إضافة toast تحذيري عند وصول البيانات للحد الأقصى (500 سجل)

### 3. تقسيم Auth.tsx إلى مكونات فرعية
- `LoginForm` — نموذج تسجيل الدخول (بريد + هوية وطنية)
- `SignupForm` — نموذج إنشاء حساب
- `BiometricLoginButton` — زر تسجيل الدخول بالبصمة
- `ResetPasswordForm` — نموذج استعادة كلمة المرور
- `normalizeDigits` — دالة مشتركة لتحويل الأرقام العربية
