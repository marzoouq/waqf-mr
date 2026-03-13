
-- سحب صلاحية EXECUTE من anon لجميع دوال public
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- إعادة منح الصلاحية فقط للدوال العامة المطلوبة
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon;
