
-- إنشاء دالة تُسحب صلاحيات anon تلقائياً بعد كل CREATE/REPLACE FUNCTION
CREATE OR REPLACE FUNCTION public.auto_revoke_anon_execute()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  obj record;
  allowed_functions text[] := ARRAY[
    'get_public_stats',
    'has_role', 
    'is_fiscal_year_accessible',
    'log_access_event',
    'check_rate_limit',
    'auto_revoke_anon_execute'
  ];
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE object_type = 'function' AND schema_name = 'public'
  LOOP
    -- سحب EXECUTE من anon
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', obj.object_identity);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', obj.object_identity);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', obj.object_identity);
    
    -- إعادة المنح للدوال العامة المسموحة
    IF split_part(obj.object_identity, '(', 1) = ANY(
      SELECT 'public.' || unnest(allowed_functions)
    ) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;

-- إنشاء مشغل الحدث
DROP EVENT TRIGGER IF EXISTS trg_auto_revoke_anon_execute;
CREATE EVENT TRIGGER trg_auto_revoke_anon_execute
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION')
EXECUTE FUNCTION public.auto_revoke_anon_execute();

-- تطبيق REVOKE الآن على جميع الدوال الحالية
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- إعادة منح الدوال العامة
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_fiscal_year_accessible(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon;

-- حماية العروض
REVOKE SELECT ON public.beneficiaries_safe FROM anon, PUBLIC;
REVOKE SELECT ON public.contracts_safe FROM anon, PUBLIC;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO authenticated;
