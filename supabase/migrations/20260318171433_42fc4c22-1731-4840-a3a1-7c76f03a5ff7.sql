
-- ============================================================
-- ترحيل مفتاح التشفير من app_settings إلى Supabase Vault
-- ============================================================

-- 1) نسخ المفتاح الحالي إلى Vault
SELECT vault.create_secret(
  (SELECT value FROM public.app_settings WHERE key = 'pii_encryption_key'),
  'pii_encryption_key',
  'AES-256 key for beneficiary PII encryption'
);

-- 2) تحديث get_pii_key() — قراءة من Vault بدل app_settings
CREATE OR REPLACE FUNCTION public.get_pii_key()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_key text;
BEGIN
  -- حماية: يجب أن يكون المستخدم مسجلاً
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  -- حماية: فقط admin و accountant يمكنهم الحصول على مفتاح التشفير
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RETURN NULL;
  END IF;
  -- قراءة المفتاح من Vault بدلاً من app_settings
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;
  RETURN v_key;
END;
$function$;

-- 3) تحديث lookup_by_national_id() — قراءة من Vault بدل app_settings
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
  -- فحص أن المستدعي هو service_role فقط
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'هذه الدالة مخصصة لـ service_role فقط';
  END IF;

  -- قراءة المفتاح من Vault بدلاً من app_settings
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;
  
  IF v_key IS NULL OR v_key = '' THEN
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

-- 4) تحديث encrypt_zatca_private_key() — استخدام get_pii_key() بدل قراءة مباشرة
CREATE OR REPLACE FUNCTION public.encrypt_zatca_private_key()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  -- الحصول على مفتاح التشفير من Vault عبر get_pii_key()
  -- ملاحظة: هذا trigger يعمل بصلاحية SECURITY DEFINER
  -- لذلك نقرأ مباشرة من Vault لأن auth.uid() قد لا يكون متاحاً في سياق trigger
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;
  
  IF v_key IS NULL OR v_key = '' THEN
    -- إذا لم يوجد مفتاح، نحفظ بدون تشفير (للتوافق)
    RETURN NEW;
  END IF;

  -- تشفير private_key فقط إذا لم يكن مشفراً مسبقاً
  IF NEW.private_key IS NOT NULL AND NEW.private_key != '' THEN
    BEGIN
      -- محاولة فك التشفير — إذا نجحت فهو مشفر مسبقاً
      PERFORM extensions.pgp_sym_decrypt(decode(NEW.private_key, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      -- ليس مشفراً → نشفّره الآن
      NEW.private_key := encode(extensions.pgp_sym_encrypt(NEW.private_key, v_key), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 5) حذف المفتاح القديم من app_settings
DELETE FROM public.app_settings WHERE key = 'pii_encryption_key';
