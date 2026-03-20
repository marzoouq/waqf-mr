
-- إصلاح دالة lookup_by_national_id لتعمل مع البيانات غير المشفرة (plaintext fallback)
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

  -- قراءة المفتاح من Vault
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'pii_encryption_key'
  LIMIT 1;

  -- إذا لم يوجد مفتاح تشفير، نبحث بمقارنة مباشرة (plaintext)
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

  -- المفتاح موجود: نبحث بفك التشفير مع fallback للنص العادي
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
      -- البيانات غير مشفرة — مقارنة مباشرة
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

-- إضافة مفتاح التشفير إلى Vault في بيئة الإنتاج (إذا لم يكن موجوداً)
-- نستخدم نفس المفتاح الافتراضي المستخدم في الهجرات السابقة
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'pii_encryption_key') THEN
    INSERT INTO vault.secrets (name, secret)
    VALUES ('pii_encryption_key', 'waqf-marzouq-pii-encryption-key-2024');
  END IF;
END $$;
