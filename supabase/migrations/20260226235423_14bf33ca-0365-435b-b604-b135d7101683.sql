
-- دالة بحث بالهوية مع فك تشفير — للاستخدام من service_role فقط
CREATE OR REPLACE FUNCTION public.lookup_by_national_id(p_national_id text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_key text;
  rec record;
BEGIN
  v_key := public.get_pii_key();
  
  FOR rec IN SELECT b.national_id, b.email FROM public.beneficiaries b WHERE b.national_id IS NOT NULL
  LOOP
    DECLARE
      decrypted_id text;
    BEGIN
      IF v_key IS NOT NULL AND v_key != '' THEN
        decrypted_id := pgp_sym_decrypt(decode(rec.national_id, 'base64'), v_key);
      ELSE
        decrypted_id := rec.national_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      decrypted_id := rec.national_id; -- غير مشفر
    END;
    
    IF decrypted_id = p_national_id THEN
      email := rec.email;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END;
$$;

-- سحب صلاحيات من الأدوار العامة
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM anon, authenticated;
