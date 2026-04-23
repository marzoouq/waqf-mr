
-- 1) دالة مساعدة تحجب القيم الحساسة قبل الكتابة في audit_log
CREATE OR REPLACE FUNCTION public.mask_sensitive_app_setting(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_key text;
  v_sensitive_keys text[] := ARRAY['pii_encryption_key', 'zatca_otp_1', 'zatca_otp_2'];
BEGIN
  IF p_data IS NULL THEN
    RETURN NULL;
  END IF;
  v_key := p_data->>'key';
  IF v_key = ANY(v_sensitive_keys) THEN
    RETURN jsonb_set(p_data, '{value}', to_jsonb('***REDACTED***'::text));
  END IF;
  RETURN p_data;
END;
$$;

-- 2) trigger function مخصصة لـ app_settings تطبق التحجيب
CREATE OR REPLACE FUNCTION public.audit_app_settings_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, user_id, new_data)
    VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NULL,
      auth.uid(),
      public.mask_sensitive_app_setting(to_jsonb(NEW))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- تجنب التسجيل إذا لم تتغير القيمة فعلياً
    IF NEW.value IS DISTINCT FROM OLD.value THEN
      INSERT INTO public.audit_log (table_name, operation, record_id, user_id, old_data, new_data)
      VALUES (
        TG_TABLE_NAME,
        TG_OP,
        NULL,
        auth.uid(),
        public.mask_sensitive_app_setting(to_jsonb(OLD)),
        public.mask_sensitive_app_setting(to_jsonb(NEW))
      );
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (table_name, operation, record_id, user_id, old_data)
    VALUES (
      TG_TABLE_NAME,
      TG_OP,
      NULL,
      auth.uid(),
      public.mask_sensitive_app_setting(to_jsonb(OLD))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- 3) ربط trigger بجدول app_settings (idempotent)
DROP TRIGGER IF EXISTS audit_app_settings ON public.app_settings;
CREATE TRIGGER audit_app_settings
  AFTER INSERT OR UPDATE OR DELETE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.audit_app_settings_trigger();
