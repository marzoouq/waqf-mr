
-- تحويل العروض إلى SECURITY INVOKER لإزالة تحذير الأمان
ALTER VIEW public.contracts_safe SET (security_invoker = on);
ALTER VIEW public.beneficiaries_safe SET (security_invoker = on);
