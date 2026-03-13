
-- الخطوة 1: نقل pgcrypto إلى extensions schema
ALTER EXTENSION pgcrypto SET SCHEMA extensions;

-- الخطوة 2: تحديث encrypt_pii
CREATE OR REPLACE FUNCTION public.encrypt_pii(p_value text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF p_value IS NULL OR p_value = '' THEN
    RETURN p_value;
  END IF;
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN p_value;
  END IF;
  RETURN encode(pgp_sym_encrypt(p_value, v_key), 'base64');
END;
$function$;

-- الخطوة 3: تحديث decrypt_pii
CREATE OR REPLACE FUNCTION public.decrypt_pii(p_encrypted text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF p_encrypted IS NULL OR p_encrypted = '' THEN
    RETURN p_encrypted;
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RETURN '********';
  END IF;
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN p_encrypted;
  END IF;
  BEGIN
    RETURN pgp_sym_decrypt(decode(p_encrypted, 'base64'), v_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN p_encrypted;
  END;
END;
$function$;

-- الخطوة 4: تحديث encrypt_beneficiary_pii
CREATE OR REPLACE FUNCTION public.encrypt_beneficiary_pii()
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

  IF NEW.national_id IS NOT NULL AND NEW.national_id != '' THEN
    BEGIN
      PERFORM pgp_sym_decrypt(decode(NEW.national_id, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      NEW.national_id := encode(pgp_sym_encrypt(NEW.national_id, v_key), 'base64');
    END;
  END IF;

  IF NEW.bank_account IS NOT NULL AND NEW.bank_account != '' THEN
    BEGIN
      PERFORM pgp_sym_decrypt(decode(NEW.bank_account, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      NEW.bank_account := encode(pgp_sym_encrypt(NEW.bank_account, v_key), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- الخطوة 5: تحديث get_active_zatca_certificate
CREATE OR REPLACE FUNCTION public.get_active_zatca_certificate()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cert RECORD;
  v_key text;
  v_decrypted_pk text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بالوصول لشهادات ZATCA';
  END IF;

  SELECT * INTO v_cert FROM zatca_certificates WHERE is_active = true LIMIT 1;
  IF v_cert IS NULL THEN
    RETURN jsonb_build_object('error', 'لا توجد شهادة نشطة');
  END IF;

  v_key := public.get_pii_key();
  IF v_key IS NOT NULL AND v_key != '' THEN
    BEGIN
      v_decrypted_pk := pgp_sym_decrypt(decode(v_cert.private_key, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      v_decrypted_pk := v_cert.private_key;
    END;
  ELSE
    v_decrypted_pk := v_cert.private_key;
  END IF;

  RETURN jsonb_build_object(
    'id', v_cert.id,
    'certificate', v_cert.certificate,
    'private_key', v_decrypted_pk,
    'zatca_secret', COALESCE(v_cert.zatca_secret, ''),
    'certificate_type', v_cert.certificate_type,
    'request_id', v_cert.request_id
  );
END;
$function$;
