
-- تأمين get_pii_key: رفض الاستدعاء المباشر من anon (بدون auth.uid)
CREATE OR REPLACE FUNCTION public.get_pii_key()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- حماية من الاستدعاء المباشر عبر anon (لا يوجد مستخدم مسجل)
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT value FROM public.app_settings WHERE key = 'pii_encryption_key' LIMIT 1);
END;
$function$;

-- تأمين get_beneficiary_decrypted: التحقق مزدوج
CREATE OR REPLACE FUNCTION public.get_beneficiary_decrypted(p_beneficiary_id uuid)
 RETURNS TABLE(id uuid, name text, national_id text, bank_account text, email text, phone text, share_percentage numeric, notes text, user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح - يجب تسجيل الدخول';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بعرض البيانات المفكوكة';
  END IF;
  RETURN QUERY
  SELECT b.id, b.name,
    public.decrypt_pii(b.national_id) as national_id,
    public.decrypt_pii(b.bank_account) as bank_account,
    b.email, b.phone, b.share_percentage, b.notes, b.user_id
  FROM public.beneficiaries b
  WHERE b.id = p_beneficiary_id OR p_beneficiary_id IS NULL;
END;
$function$;

-- تأمين lookup_by_national_id
CREATE OR REPLACE FUNCTION public.lookup_by_national_id(p_national_id text)
 RETURNS TABLE(email text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  rec record;
  decrypted_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح - يجب تسجيل الدخول';
  END IF;
  v_key := public.get_pii_key();
  FOR rec IN SELECT b.national_id, b.email FROM public.beneficiaries b WHERE b.national_id IS NOT NULL
  LOOP
    BEGIN
      IF v_key IS NOT NULL AND v_key != '' THEN
        decrypted_id := pgp_sym_decrypt(decode(rec.national_id, 'base64'), v_key);
      ELSE
        decrypted_id := rec.national_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      decrypted_id := rec.national_id;
    END;
    IF decrypted_id = p_national_id THEN
      email := rec.email;
      RETURN NEXT;
      RETURN;
    END IF;
  END LOOP;
END;
$function$;

-- تأمين get_active_zatca_certificate
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
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'غير مصرح - يجب تسجيل الدخول';
  END IF;
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
