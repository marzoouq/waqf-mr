

# خطة: استخراج `useFieldErrors` كـ hook مشترك

## المنطق المكرر (مطابق حرفياً)

| المنطق | `useLoginForm.ts` (سطر) | `SignupForm.tsx` (سطر) |
|--------|-------------------------|------------------------|
| `useState<FieldErrors>({})` | 30 | 25 |
| `clearFieldError` | 48-55 | 31-38 |
| `validateEmailFormat` | 57-61 | 40-44 |

## الملفات والتغييرات

### 1. إنشاء `src/hooks/auth/useFieldErrors.ts` (جديد)

```typescript
export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export function useFieldErrors<K extends string>() {
  // fieldErrors state
  // clearFieldError(field: K) — حذف خطأ حقل
  // setFieldError(field: K, msg: string) — تعيين خطأ حقل
  // setErrors(errors: FieldErrors<K>) — تعيين أخطاء متعددة
  // hasErrors — boolean محسوب
  // validateEmailFormat(value: string, field: K) — تحقق + تعيين خطأ
}
```

### 2. تحديث `src/hooks/auth/useLoginForm.ts`
- حذف: `useState<FieldErrors>` (سطر 30)، `clearFieldError` (48-55)، `validateEmailFormat` (57-61)
- إضافة: `const { fieldErrors, clearFieldError, setErrors, validateEmailFormat } = useFieldErrors<'email' | 'password' | 'nationalId'>()`
- استبدال `setFieldErrors(errors)` بـ `setErrors(errors)` في `handleSignIn`
- `focusFirstError` يبقى محلياً (يعتمد على refs خاصة)

### 3. تحديث `src/components/auth/SignupForm.tsx`
- حذف: `useState<{email?; password?}>` (سطر 25)، `clearFieldError` (31-38)، `validateEmailFormat` (40-44)
- إضافة: `const { fieldErrors, clearFieldError, setErrors, validateEmailFormat } = useFieldErrors<'email' | 'password'>()`
- استبدال `setFieldErrors(errors)` بـ `setErrors(errors)` في `handleSignUp`
- `focusFirstError` يبقى محلياً

### 4. فحص TypeScript
- تشغيل `npx tsc --noEmit` للتأكد من عدم وجود أخطاء

## ما لن يتغير
- سلوك النماذج الحالي (صفر تغيير وظيفي)
- ملفات محمية (`AuthContext`, `client.ts`, `types.ts`)
- اختبارات `SignupForm.test.tsx` ستعمل بدون تعديل

