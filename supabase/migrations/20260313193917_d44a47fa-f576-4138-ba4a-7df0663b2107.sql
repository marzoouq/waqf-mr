
-- إصلاح أمني: سحب صلاحيات EXECUTE من anon (يُنفذ مباشرة)
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- إعادة منح الدوال العامة فقط لـ anon
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon;

-- منع صلاحيات تلقائية مستقبلية
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- حماية العروض الحساسة
REVOKE SELECT ON public.beneficiaries_safe FROM anon;
REVOKE SELECT ON public.contracts_safe FROM anon;
REVOKE SELECT ON public.beneficiaries_safe FROM PUBLIC;
REVOKE SELECT ON public.contracts_safe FROM PUBLIC;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;
