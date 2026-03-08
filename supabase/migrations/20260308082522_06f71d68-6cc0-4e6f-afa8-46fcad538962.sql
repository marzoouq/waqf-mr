
-- دالة لجلب الشهادة النشطة مع فك تشفير المفتاح الخاص
CREATE OR REPLACE FUNCTION public.get_active_zatca_certificate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cert RECORD;
  v_key text;
  v_decrypted_pk text;
BEGIN
  -- فقط الناظر
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بالوصول لشهادات ZATCA';
  END IF;

  SELECT * INTO v_cert FROM zatca_certificates WHERE is_active = true LIMIT 1;
  IF v_cert IS NULL THEN
    RETURN jsonb_build_object('error', 'لا توجد شهادة نشطة');
  END IF;

  -- محاولة فك التشفير
  v_key := public.get_pii_key();
  IF v_key IS NOT NULL AND v_key != '' THEN
    BEGIN
      v_decrypted_pk := pgp_sym_decrypt(decode(v_cert.private_key, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      -- إذا فشل فك التشفير، قد يكون النص غير مشفّر
      v_decrypted_pk := v_cert.private_key;
    END;
  ELSE
    v_decrypted_pk := v_cert.private_key;
  END IF;

  RETURN jsonb_build_object(
    'id', v_cert.id,
    'certificate', v_cert.certificate,
    'private_key', v_decrypted_pk,
    'certificate_type', v_cert.certificate_type,
    'request_id', v_cert.request_id
  );
END;
$$;

-- فقط authenticated يمكنهم استدعاؤها (الحماية الداخلية تتحقق من الدور)
GRANT EXECUTE ON FUNCTION public.get_active_zatca_certificate() TO authenticated;
