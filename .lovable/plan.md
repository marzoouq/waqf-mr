
# خطة إنشاء Edge Function للتحقق من التسجيل على مستوى الخادم

## المشكلة الحالية
التحقق من إعداد `registration_enabled` يتم فقط على مستوى العميل (إخفاء واجهة التسجيل). مستخدم ذكي يمكنه استدعاء `supabase.auth.signUp()` مباشرة من وحدة التحكم وتجاوز هذا القيد.

## الحل
إنشاء Edge Function وسيطة (`guard-signup`) تتحقق من الإعداد على الخادم قبل إنشاء الحساب، ثم تعديل `AuthContext` لاستدعائها بدلاً من `supabase.auth.signUp()` مباشرة.

## التغييرات المطلوبة

### 1. إنشاء Edge Function: `supabase/functions/guard-signup/index.ts`
- تستقبل `email` و `password` من الطلب
- تستعلم من `app_settings` عن قيمة `registration_enabled`
- إذا كان التسجيل معطلاً: ترجع خطأ 403
- إذا كان مفعلاً: تنشئ الحساب عبر Supabase Admin API وترجع النتيجة
- تتضمن CORS headers ومعالجة OPTIONS
- تتحقق من صحة المدخلات (بريد صالح، كلمة مرور 6-128 حرف)

### 2. تسجيل الوظيفة في `supabase/config.toml`
```toml
[functions.guard-signup]
verify_jwt = false
```

### 3. تعديل `src/contexts/AuthContext.tsx`
تغيير دالة `signUp` لتستدعي `guard-signup` بدلاً من `supabase.auth.signUp()`:
```typescript
const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.functions.invoke('guard-signup', {
    body: { email, password }
  });
  if (error || data?.error) {
    return { error: new Error(data?.error || error?.message || 'خطأ في التسجيل') };
  }
  return { error: null };
};
```

## تفاصيل تقنية للوظيفة

```
الطلب ──▶ guard-signup
              │
              ├─ التحقق من المدخلات (email, password)
              │
              ├─ استعلام app_settings.registration_enabled
              │    ├─ false ──▶ 403 "التسجيل معطل حالياً"
              │    └─ true ──▶ متابعة
              │
              └─ إنشاء المستخدم عبر supabase.auth.admin.createUser()
                   └─ إرجاع النتيجة
```

## الملفات المتأثرة
| الملف | التغيير |
|-------|---------|
| `supabase/functions/guard-signup/index.ts` | ملف جديد |
| `supabase/config.toml` | إضافة تسجيل الوظيفة (تلقائي) |
| `src/contexts/AuthContext.tsx` | تعديل دالة `signUp` |

## الأمان
- لا يمكن تجاوز القيد من المتصفح لأن التحقق يتم على الخادم
- المدخلات تُتحقق قبل المعالجة
- تُستخدم `service_role` key داخلياً فقط لإنشاء الحساب
