# تعليمات الوكيل — نظام إدارة وقف مرزوق بن علي الثبيتي

## قواعد عامة

- لا تعدّل ملفات المصادقة (`AuthContext.tsx`, `ProtectedRoute.tsx`, `SecurityGuard.tsx`) دون طلب صريح
- لا تحذف كود موجود دون سبب واضح ومبرّر
- عند إصلاح خطأ، لا تغيّر ملفات غير مرتبطة بالمشكلة
- لا تعدّل الملفات المحمية: `supabase/config.toml`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`

## قواعد أمنية

- الأدوار تُخزّن حصراً في جدول `user_roles` — لا localStorage ولا profile
- كل جدول جديد يجب أن يحتوي على سياسات RLS
- كل Edge Function يجب أن تتحقق من المستخدم عبر `getUser()`
- لا تستخدم `getSession()` أبداً في Edge Functions
- لا تستخدم `SUPABASE_SERVICE_ROLE_KEY` كبديل لمصادقة المستخدم
- `verify_jwt = false` مقصود — لا تغيّره

## قواعد الواجهة

- الواجهة عربية بالكامل (RTL)
- رسائل Toast بالعربية عبر `sonner`
- استخدم متغيرات CSS للألوان (`hsl(var(--primary))`) — لا ألوان ثابتة
- استخدم `@/` كاختصار المسار دائماً
- استخدم `logger` من `@/lib/logger` بدلاً من `console.*`

## قواعد قاعدة البيانات

- أسماء الجداول والأعمدة بـ `snake_case`
- استخدم `createCrudFactory` لأي جدول CRUD جديد
- لا تنشئ مرجع foreign key إلى `auth.users` — استخدم جدول `profiles` إذا لزم الأمر
- استخدم validation triggers بدلاً من CHECK constraints للتحقق الزمني
