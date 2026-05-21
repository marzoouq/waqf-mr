# Role Source — مصدر الدور في النظام

## السياق

النظام يقرأ دور المستخدم من مصدرين بترتيب أسبقية:

1. **JWT `app_metadata.user_role`** — يُقرأ أولًا من session (cache سريع).
2. **DB `user_roles`** — fallback عبر `fetchUserRole(userId)` إذا غاب JWT claim.

> الموقع: `src/hooks/auth/session/useAuthListener.ts:25` (JWT) و`src/lib/auth/fetchUserRole.ts` (DB).

## المصدر الحقيقي للحقيقة

> **`public.user_roles` هو المصدر الأصلي.** JWT claim مجرّد cache مُولَّد من trigger عند تسجيل الدخول.

كل قرارات RLS في DB تستخدم `has_role(auth.uid(), 'role'::app_role)` التي تقرأ من `user_roles` مباشرة — لا تعتمد على JWT claim.

## متى يصبح JWT stale؟

- بعد تغيير دور المستخدم من `/dashboard/users` دون refresh للـ session.
- بعد إقصاء/ترقية المستخدم بينما الـ session نشط.

في هذه الحالات:
- **الواجهة (React)** قد تعرض روابط/أقسام للدور القديم حتى refresh.
- **DB RLS** يحمي البيانات بأي حال — لا تسرّب فعلي.
- **Edge Functions** التي تستخدم `getClaims()` تقرأ JWT (قد يكون stale)؛ والتي تستخدم `getUser()` تقرأ الأحدث من السيرفر.

## الإجراءات الموصى بها بعد تغيير دور

1. إجبار sign-out للمستخدم المتأثّر.
2. أو استدعاء `supabase.auth.refreshSession()` من الواجهة.
3. أو الانتظار حتى انتهاء صلاحية JWT (التجديد التلقائي يُعيد قراءة الـ claim).

## القرارات الحساسة

لا تعتمد على JWT claim وحده في:
- منح صلاحيات إقفال السنة المالية.
- توزيع الحصص.
- تعديل user_roles نفسه.

استخدم `has_role()` في RLS أو `getUser()` في Edge Functions للقرارات الحرجة.

## ملاحظة لذاكرة المشروع

> "Admin role has absolute access, bypassing all RLS and route guards" — هذا **بالتصميم** على مستوى الواجهة فقط (في `RequirePermission`). على مستوى DB، policy لكل جدول تستخدم `has_role(auth.uid(), 'admin'::app_role)` صراحة، لا "bypass" تلقائي.
