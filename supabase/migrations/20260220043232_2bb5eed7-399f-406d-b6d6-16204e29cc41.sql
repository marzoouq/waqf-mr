
-- ═══════════════════════════════════════════════════════════
-- إعادة منح anon مع تشديد الدالة نفسها
-- السبب: login_failed يُسجل قبل المصادقة (anon context)
-- الحل: السماح لـ anon بأنواع أحداث محدودة فقط
-- ═══════════════════════════════════════════════════════════

GRANT EXECUTE ON FUNCTION public.log_access_event TO anon;

-- تحديث الدالة لتقييد anon إلى أحداث محددة فقط
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type TEXT,
  p_email TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_target_path TEXT DEFAULT NULL,
  p_ip_info TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  caller_role TEXT;
  allowed_anon_events TEXT[] := ARRAY['login_failed', 'login_success', 'signup_attempt'];
BEGIN
  -- التحقق من المدخلات الأساسية
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'نوع الحدث مطلوب';
  END IF;
  IF p_event_type NOT IN ('login_success', 'login_failed', 'logout', 'idle_logout', 'unauthorized_access', 'signup_attempt') THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;

  -- تحديد دور المستدعي
  caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  
  -- anon يمكنه فقط تسجيل أحداث الدخول/التسجيل
  IF (caller_role IS NULL OR caller_role = 'anon') THEN
    IF NOT (p_event_type = ANY(allowed_anon_events)) THEN
      RAISE EXCEPTION 'غير مصرح بهذا النوع من الأحداث';
    END IF;
    -- anon لا يمكنه تمرير user_id (منع انتحال)
    IF p_user_id IS NOT NULL THEN
      p_user_id := NULL;
    END IF;
  END IF;

  -- حدود الطول
  IF p_email IS NOT NULL AND length(p_email) > 320 THEN
    RAISE EXCEPTION 'البريد الإلكتروني طويل جداً';
  END IF;
  IF p_target_path IS NOT NULL AND length(p_target_path) > 500 THEN
    RAISE EXCEPTION 'المسار طويل جداً';
  END IF;
  IF p_ip_info IS NOT NULL AND length(p_ip_info) > 500 THEN
    p_ip_info := left(p_ip_info, 500);
  END IF;

  INSERT INTO public.access_log (event_type, email, user_id, target_path, ip_info, metadata)
  VALUES (p_event_type, p_email, p_user_id, p_target_path, p_ip_info, p_metadata);
END;
$$;
