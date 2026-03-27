
-- ╔══════════════════════════════════════════════════════════════╗
-- ║  التحسينات الأمنية 41-42, 47, 48, 56                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ═══ #42: إعادة تفعيل تشفير private_key في zatca_certificates ═══
CREATE OR REPLACE FUNCTION public.encrypt_zatca_private_key()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_key text;
BEGIN
  IF NEW.private_key IS NULL OR NEW.private_key = '' THEN
    RETURN NEW;
  END IF;
  
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;
  
  -- محاولة فك التشفير للتحقق مما إذا كانت القيمة مشفرة بالفعل
  BEGIN
    PERFORM extensions.pgp_sym_decrypt(decode(NEW.private_key, 'base64'), v_key);
    -- إذا نجحت فالقيمة مشفرة بالفعل — لا نعيد التشفير
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- القيمة غير مشفرة — نشفرها
    NEW.private_key := encode(extensions.pgp_sym_encrypt(NEW.private_key, v_key), 'base64');
    RETURN NEW;
  END;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_zatca_private_key ON public.zatca_certificates;
CREATE TRIGGER trg_encrypt_zatca_private_key
  BEFORE INSERT OR UPDATE OF private_key
  ON public.zatca_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.encrypt_zatca_private_key();

-- تشفير البيانات الموجودة (تحديث يدوي يُطلق المشغّل)
DO $$
DECLARE
  v_rec RECORD;
BEGIN
  FOR v_rec IN SELECT id, private_key FROM public.zatca_certificates LOOP
    UPDATE public.zatca_certificates SET private_key = v_rec.private_key WHERE id = v_rec.id;
  END LOOP;
END;
$$;

-- ═══ #41: دالة حذف OTP من app_settings بعد الاستخدام ═══
CREATE OR REPLACE FUNCTION public.clear_zatca_otp()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.app_settings 
  SET value = '', updated_at = now()
  WHERE key IN ('zatca_otp_1', 'zatca_otp_2') AND value != '';
END;
$$;

REVOKE ALL ON FUNCTION public.clear_zatca_otp() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_zatca_otp() FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_zatca_otp() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_zatca_otp() TO service_role;

-- ═══ #56: إصلاح نوع p_user_id في log_access_event ═══
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL,
  p_user_id text DEFAULT NULL,
  p_target_path text DEFAULT NULL,
  p_device_info text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- فحص صحة UUID إذا أُرسل
  IF p_user_id IS NOT NULL AND p_user_id != '' THEN
    BEGIN
      v_user_id := p_user_id::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      v_user_id := NULL;
    END;
  END IF;
  
  INSERT INTO public.access_log (event_type, email, user_id, target_path, device_info, metadata)
  VALUES (p_event_type, p_email, v_user_id, p_target_path, p_device_info, p_metadata);
END;
$$;

-- ═══ #48: cron يومي لتنظيف سجلات PENDING في invoice_chain ═══
CREATE OR REPLACE FUNCTION public.cleanup_pending_invoice_chain()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.invoice_chain
  WHERE invoice_hash = 'PENDING'
    AND created_at < now() - interval '1 hour';
END;
$$;
