-- 1) Upgrade trigger to honor [anon-callable] marker in function comments
CREATE OR REPLACE FUNCTION public.auto_revoke_anon_execute()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  obj record;
  service_role_only_functions text[] := ARRAY[
    'lookup_by_national_id',
    'get_pii_key',
    'decrypt_pii',
    'encrypt_pii',
    'get_active_zatca_certificate'
  ];
  func_name text;
  func_comment text;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE object_type = 'function' AND schema_name = 'public'
  LOOP
    func_name := split_part(split_part(obj.object_identity, '(', 1), '.', 2);
    func_comment := COALESCE(obj_description(obj.objid), '');

    -- Anon-callable exception: function explicitly marked as public
    IF position('[anon-callable]' in func_comment) > 0 THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', obj.object_identity);
      CONTINUE;
    END IF;

    -- Default: revoke from anon and PUBLIC
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', obj.object_identity);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', obj.object_identity);

    -- Grant authenticated unless service-role-only
    IF NOT (func_name = ANY(service_role_only_functions)) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', obj.object_identity);
    END IF;
  END LOOP;
END;
$function$;

-- 2) Mark public functions with explicit anon-callable comment
COMMENT ON FUNCTION public.get_public_stats() IS
  '[anon-callable] Public landing-page stats. Output filtered by app_settings (admin-controlled visibility per metric).';

COMMENT ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) IS
  '[anon-callable] Pre-auth client telemetry/error logger. Writes to access_logs (RLS prevents reads by users).';

-- 3) Immediate fix: re-grant EXECUTE to anon + authenticated
GRANT EXECUTE ON FUNCTION public.get_public_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) TO anon, authenticated;