
-- تحديث search_path لدالة encrypt_zatca_private_key لتشمل extensions
CREATE OR REPLACE FUNCTION public.encrypt_zatca_private_key()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.private_key IS NOT NULL AND NEW.private_key != '' THEN
    BEGIN
      -- Check if already encrypted
      PERFORM pgp_sym_decrypt(decode(NEW.private_key, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      -- Not encrypted yet, encrypt it
      NEW.private_key := encode(pgp_sym_encrypt(NEW.private_key, v_key), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$function$;
