
-- Fix Cron permissions: grant postgres role EXECUTE on scheduled functions
GRANT EXECUTE ON FUNCTION public.cron_auto_expire_contracts() TO postgres;
GRANT EXECUTE ON FUNCTION public.cron_check_contract_expiry() TO postgres;
