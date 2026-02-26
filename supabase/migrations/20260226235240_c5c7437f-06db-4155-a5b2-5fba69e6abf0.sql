
-- تحديث دوال التشفير لقراءة المفتاح من app_settings بدلاً من current_setting

-- 1. دالة مساعدة لجلب مفتاح التشفير
CREATE OR REPLACE FUNCTION public.get_pii_key()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT value FROM public.app_settings WHERE key = 'pii_encryption_key' LIMIT 1;
$$;

-- سحب صلاحيات التنفيذ
REVOKE EXECUTE ON FUNCTION public.get_pii_key() FROM anon, authenticated;

-- 2. تحديث دالة التشفير
CREATE OR REPLACE FUNCTION public.encrypt_pii(p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
BEGIN
  IF p_value IS NULL OR p_value = '' THEN
    RETURN p_value;
  END IF;
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN p_value; -- لا مفتاح = لا تشفير
  END IF;
  RETURN encode(pgp_sym_encrypt(p_value, v_key), 'base64');
END;
$$;

-- 3. تحديث دالة فك التشفير
CREATE OR REPLACE FUNCTION public.decrypt_pii(p_encrypted text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- 4. تحديث trigger التشفير
CREATE OR REPLACE FUNCTION public.encrypt_beneficiary_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;
