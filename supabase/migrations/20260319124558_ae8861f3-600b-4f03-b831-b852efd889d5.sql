DO $$
DECLARE
  v_exists boolean;
  v_key text;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key'
  ) INTO v_exists;

  IF NOT v_exists THEN
    SELECT value INTO v_key
    FROM public.app_settings WHERE key = 'pii_encryption_key';

    IF v_key IS NOT NULL AND v_key != '' THEN
      PERFORM vault.create_secret(v_key, 'pii_encryption_key', 'PII encryption key');
    ELSE
      PERFORM vault.create_secret(
        '4df9561b2a17ed738b0a622e9088dd1139d000c33d600a839649cc7b43452553',
        'pii_encryption_key',
        'PII encryption key for beneficiary data'
      );
    END IF;
  END IF;
END $$;