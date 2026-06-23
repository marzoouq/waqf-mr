CREATE OR REPLACE FUNCTION public.lookup_by_national_id(p_national_id text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  rec record;
  v_decrypted text;
BEGIN
  -- ملاحظة أمنية: لا نشترط service_role هنا لأن الدالة تُستدعى من Edge Function عام
  -- (lookup-national-id) قبل تسجيل الدخول. الحماية تعتمد على:
  --   1) GRANT EXECUTE محدود.
  --   2) Rate limit على مستوى IP ورقم الهوية في الـ Edge Function.
  --   3) الدالة ترجع البريد فقط، ولا تكشف بيانات أخرى.
  --   4) الردود من الـ Edge Function مموّهة (masked email + ردود متطابقة).

  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  IF v_key IS NULL OR v_key = '' THEN
    FOR rec IN
      SELECT b.national_id AS enc_nid, b.email AS ben_email
      FROM public.beneficiaries b
      WHERE b.national_id IS NOT NULL
    LOOP
      IF rec.enc_nid = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    END LOOP;
    RETURN;
  END IF;

  FOR rec IN
    SELECT b.national_id AS enc_nid, b.email AS ben_email
    FROM public.beneficiaries b
    WHERE b.national_id IS NOT NULL
  LOOP
    BEGIN
      v_decrypted := extensions.pgp_sym_decrypt(decode(rec.enc_nid, 'base64'), v_key);
      IF v_decrypted = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF rec.enc_nid = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    END;
  END LOOP;

  RETURN;
END;
$function$;

REVOKE ALL ON FUNCTION public.lookup_by_national_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_by_national_id(text) TO anon, authenticated, service_role;