-- إصلاح: إضافة security_invoker=true على contracts_safe VIEW
-- هذا يضمن تطبيق RLS بسياق المستخدم المستدعي وليس مالك العرض
ALTER VIEW public.contracts_safe SET (security_invoker = true);