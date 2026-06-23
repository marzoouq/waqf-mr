## نتيجة التحقق الجنائي

المشكلة الظاهرة في الإنتاج ليست فشل كلمة المرور بعد الإصلاح السابق. دليل الإنتاج من `access_log` يثبت أن المستخدم دخل بدور `beneficiary` ثم حاول الوصول لمسار ناظر:

```text
event_type: unauthorized_access
target_path: /dashboard/users
current_role: beneficiary
required_roles: [admin]
```

هذا يفسّر شاشة:

```text
غير مصرح بالدخول
دورك الحالي: مستفيد
```

## السبب المرجّح

بعد تسجيل الدخول، `useRoleRedirect` يقرأ `?from=` من رابط `/auth` وينقل المستخدم إليه إذا كان داخلياً فقط. حالياً لا يتحقق هل هذا المسار مناسب لدور المستخدم.

لذلك إذا كان رابط الدخول مثل:

```text
/auth?from=/dashboard/users
```

وسجّل المستفيد الدخول بنجاح، يتم إرساله إلى `/dashboard/users`، ثم `ProtectedRoute` يمنعه بشكل صحيح لأن هذا مسار ناظر فقط.

## الإصلاح المقترح

تعديل `src/hooks/auth/role/useRoleRedirect.ts` فقط لإضافة فلترة حسب الدور قبل تنفيذ `navigate`:

- `beneficiary` يسمح فقط بمسارات `/beneficiary`.
- `waqif` يسمح فقط بمسارات `/waqif`.
- `accountant` يسمح فقط بمسارات `/dashboard`.
- `admin` يسمح بمسارات `/dashboard`، ويمكن إبقاء `/beneficiary` كمعاينة بوابة المستفيد للناظر.
- إذا كان `from` غير مناسب للدور، يتم تجاهله والذهاب للمسار الافتراضي للدور.

## تفاصيل تقنية

إضافة دالة صغيرة بجانب `sanitizeFrom`:

```ts
function isFromAllowedForRole(from: string, role: string): boolean {
  if (role === 'admin') return from.startsWith('/dashboard') || from.startsWith('/beneficiary');
  if (role === 'accountant') return from.startsWith('/dashboard');
  if (role === 'beneficiary') return from.startsWith('/beneficiary');
  if (role === 'waqif') return from.startsWith('/waqif');
  return false;
}
```

ثم داخل `useEffect`:

```ts
const sanitizedFrom = sanitizeFrom(searchParams.get('from'));
const from = sanitizedFrom && isFromAllowedForRole(sanitizedFrom, role) ? sanitizedFrom : null;
navigate(from ?? home, { replace: true });
```

## اختبار مستقل قبل الاعتماد

بعد التنفيذ سأضيف/أستخدم اختبار وحدة مستقل للمنطق دون الاعتماد على جلسة حقيقية أو بيانات إنتاج:

1. `role=beneficiary`, `from=/dashboard/users` → النتيجة `/beneficiary`.
2. `role=beneficiary`, `from=/beneficiary/invoices` → النتيجة `/beneficiary/invoices`.
3. `role=admin`, `from=/dashboard/users` → النتيجة `/dashboard/users`.
4. `role=accountant`, `from=/dashboard/users` → النتيجة `/dashboard/users` أو يُمنع لاحقاً بواسطة `ProtectedRoute` إذا كان Admin-only؛ هذا سلوك قائم وصحيح.
5. `from=//evil.com` أو `/auth` أو `/unauthorized` → يتم تجاهله كما هو حالياً.

## حدود التنفيذ

- لا تعديل على قاعدة البيانات.
- لا تعديل على Edge Functions.
- لا تعديل على `ProtectedRoute` أو `RequirePermission`.
- لا تغيير في صلاحيات المسارات نفسها.
- الإصلاح يمنع توجيه المستفيد لمسارات الناظر بعد تسجيل دخول ناجح، ولا يفتح أي صلاحية جديدة.