
-- Grant execute to all relevant roles that may need to call these functions
GRANT EXECUTE ON FUNCTION public.cron_auto_expire_contracts() TO postgres, service_role, supabase_admin;
GRANT EXECUTE ON FUNCTION public.cron_check_contract_expiry() TO postgres, service_role, supabase_admin;
