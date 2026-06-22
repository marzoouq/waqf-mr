DO $$
DECLARE
  fn record;
  service_role_only_functions text[] := ARRAY[
    'lookup_by_national_id',
    'get_pii_key',
    'decrypt_pii',
    'encrypt_pii',
    'get_active_zatca_certificate',
    'encrypt_zatca_private_key',
    'encrypt_zatca_otp_setting',
    'consume_zatca_otp',
    'clear_zatca_otp',
    'get_beneficiary_decrypted',
    'encrypt_beneficiary_pii',
    'custom_access_token_hook',
    'sync_role_to_auth_meta',
    'delete_email',
    'enqueue_email',
    'read_email_batch',
    'move_to_dlq',
    'auto_revoke_anon_execute'
  ];
  anon_callable_functions text[] := ARRAY['get_public_stats'];
  fn_name text;
  fn_sig text;
BEGIN
  FOR fn IN
    SELECT p.proname AS name,
           n.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')' AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    fn_name := fn.name;
    fn_sig := fn.sig;

    -- ابدأ بسحب كل صلاحيات التنفيذ من anon و PUBLIC
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_sig);

    -- استثناء: دوال متاحة للزوار صراحةً
    IF fn_name = ANY(anon_callable_functions) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', fn_sig);
      CONTINUE;
    END IF;

    -- استثناء: دوال محصورة على service_role فقط (PII / ZATCA / queue)
    IF fn_name = ANY(service_role_only_functions) THEN
      -- لا منح لأحد — service_role يتجاوز الصلاحيات
      CONTINUE;
    END IF;

    -- الباقي: متاح للمستخدمين المسجَّلين فقط
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn_sig);
  END LOOP;
END $$;