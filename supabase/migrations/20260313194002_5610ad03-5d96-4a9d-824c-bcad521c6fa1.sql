
CREATE OR REPLACE FUNCTION public.auto_revoke_anon_execute()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', obj.object_identity);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', obj.object_identity);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', obj.object_identity);
    
    IF split_part(obj.object_identity, '(', 1) = ANY(
      SELECT 'public.' || unnest(allowed_functions)
    ) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;
