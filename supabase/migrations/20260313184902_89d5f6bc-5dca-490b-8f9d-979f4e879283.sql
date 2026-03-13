
-- ============================================================
-- إصلاح أمني نهائي: سحب صلاحيات EXECUTE من anon
-- هذه الهجرة يجب أن تُنفذ بعد pg_dump لضمان بقاء التأثير
-- ============================================================

-- 1) سحب EXECUTE من جميع الدوال في schema public من anon و PUBLIC
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

-- 2) منح EXECUTE للمستخدمين المسجلين (authenticated)
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 3) إعادة منح الصلاحية للدوال العامة فقط التي يحتاجها anon
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon;

-- 4) منع منح صلاحيات تلقائية لـ anon و PUBLIC على الدوال المستقبلية
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;

-- 5) سحب صلاحيات SELECT من العروض الحساسة لـ anon
REVOKE SELECT ON public.beneficiaries_safe FROM anon;
REVOKE SELECT ON public.contracts_safe FROM anon;
REVOKE SELECT ON public.beneficiaries_safe FROM PUBLIC;
REVOKE SELECT ON public.contracts_safe FROM PUBLIC;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;
