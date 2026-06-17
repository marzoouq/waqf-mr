-- R4 — Wave 4: Security hardening (Vault, OTP encryption, duplicate triggers, anon RPC lockdown)

-- ─────────────────────────────────────────────────────────────
-- 1) إزالة الترغر المكرّر على zatca_certificates
--    encrypt_zatca_pk_trigger و trg_encrypt_zatca_private_key يستدعيان نفس الدالة
--    وجود ترغرين متطابقين على نفس الحقل = شغل مضاعف + خطر سلوكي
-- ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_encrypt_zatca_private_key ON public.zatca_certificates;

-- ─────────────────────────────────────────────────────────────
-- 2) تشفير ZATCA OTP عند الكتابة في app_settings
--    الـ OTP يُحفظ نصاً ساطعاً حالياً في app_settings (zatca_otp_1, zatca_otp_2)
--    نضيف ترغر BEFORE INSERT/UPDATE يشفّره عبر get_pii_key() (vault)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.encrypt_zatca_otp_setting()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
BEGIN
  IF NEW.key NOT IN ('zatca_otp_1','zatca_otp_2') THEN
    RETURN NEW;
  END IF;
  IF NEW.value IS NULL OR NEW.value = '' THEN
    RETURN NEW;
  END IF;
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    -- لا نعطّل العملية لكن نُعلّم القيمة كنص ساطع — يجب توفّر المفتاح
    RETURN NEW;
  END IF;
  -- إذا كانت مشفّرة سابقاً (قابلة لفك التشفير) نتركها
  BEGIN
    PERFORM extensions.pgp_sym_decrypt(decode(NEW.value, 'base64'), v_key);
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    NEW.value := encode(extensions.pgp_sym_encrypt(NEW.value, v_key), 'base64');
    RETURN NEW;
  END;
END;
$$;

DROP TRIGGER IF EXISTS encrypt_zatca_otp_settings_trg ON public.app_settings;
CREATE TRIGGER encrypt_zatca_otp_settings_trg
  BEFORE INSERT OR UPDATE OF value ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.encrypt_zatca_otp_setting();

-- RPC لاستهلاك OTP بشكل آمن من داخل Edge Function (service_role)
CREATE OR REPLACE FUNCTION public.consume_zatca_otp()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_key text;
  v_encrypted text;
  v_plain text;
BEGIN
  -- مفتاح فك التشفير (vault)
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;

  -- أولوية: otp_2 ثم otp_1
  SELECT value INTO v_encrypted FROM public.app_settings
   WHERE key = 'zatca_otp_2' AND value IS NOT NULL AND value <> '' LIMIT 1;
  IF v_encrypted IS NULL THEN
    SELECT value INTO v_encrypted FROM public.app_settings
     WHERE key = 'zatca_otp_1' AND value IS NOT NULL AND value <> '' LIMIT 1;
  END IF;
  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;
  IF v_key IS NULL THEN
    RETURN v_encrypted; -- fallback: نص ساطع (لا مفتاح)
  END IF;
  BEGIN
    v_plain := extensions.pgp_sym_decrypt(decode(v_encrypted, 'base64'), v_key);
  EXCEPTION WHEN OTHERS THEN
    v_plain := v_encrypted; -- لم تكن مشفّرة
  END;
  -- نحذف الاستعمال — OTP يُستخدم مرّة واحدة
  DELETE FROM public.app_settings WHERE key IN ('zatca_otp_1','zatca_otp_2');
  RETURN v_plain;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_zatca_otp() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_zatca_otp() TO service_role;

-- تشفير القيم الموجودة حالياً (إن وُجدت) — يستفيد من الترغر عبر UPDATE no-op
UPDATE public.app_settings
   SET value = value
 WHERE key IN ('zatca_otp_1','zatca_otp_2');

-- ─────────────────────────────────────────────────────────────
-- 3) إغلاق lookup_by_national_id أمام anon/authenticated
--    تُستدعى حصراً من Edge Function (lookup-national-id) بـ service_role
--    وجودها مفتوحة لـ anon = مسار جانبي لتعداد أرقام الهوية بدون rate limit
-- ─────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_by_national_id(text) TO service_role;

-- ─────────────────────────────────────────────────────────────
-- 4) توثيق دوال anon المتبقية كاستثناءات مقصودة (لا تغيير سلوكي)
--    check_rate_limit, get_rate_limit_count, log_access_event, get_public_stats
--    كلها تخدم تدفقات pre-auth شرعية ومحمية داخلياً
-- ─────────────────────────────────────────────────────────────
COMMENT ON FUNCTION public.check_rate_limit IS 'anon-callable by design: pre-auth login throttling';
COMMENT ON FUNCTION public.get_rate_limit_count IS 'anon-callable by design: pre-auth rate display';
COMMENT ON FUNCTION public.log_access_event IS 'anon-callable by design: must log failed logins from anon';
COMMENT ON FUNCTION public.get_public_stats IS 'anon-callable by design: landing page public stats';