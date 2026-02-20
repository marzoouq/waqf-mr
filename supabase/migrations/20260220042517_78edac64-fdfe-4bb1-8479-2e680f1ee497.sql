
-- ═══════════════════════════════════════════════════════════
-- تشديد دوال SECURITY DEFINER بإضافة التحقق من المدخلات
-- ═══════════════════════════════════════════════════════════

-- 1) تشديد notify_admins
CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- التحقق من المدخلات
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'العنوان مطلوب';
  END IF;
  IF length(p_title) > 200 THEN
    RAISE EXCEPTION 'العنوان طويل جداً (الحد الأقصى 200 حرف)';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'الرسالة مطلوبة';
  END IF;
  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'الرسالة طويلة جداً (الحد الأقصى 2000 حرف)';
  END IF;
  IF p_type NOT IN ('info', 'warning', 'error', 'success') THEN
    RAISE EXCEPTION 'نوع إشعار غير صالح';
  END IF;
  IF p_link IS NOT NULL AND length(p_link) > 500 THEN
    RAISE EXCEPTION 'الرابط طويل جداً';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT ur.user_id, p_title, p_message, p_type, p_link
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

-- 2) تشديد notify_all_beneficiaries
CREATE OR REPLACE FUNCTION public.notify_all_beneficiaries(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- التحقق من المدخلات
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'العنوان مطلوب';
  END IF;
  IF length(p_title) > 200 THEN
    RAISE EXCEPTION 'العنوان طويل جداً (الحد الأقصى 200 حرف)';
  END IF;
  IF p_message IS NULL OR length(trim(p_message)) = 0 THEN
    RAISE EXCEPTION 'الرسالة مطلوبة';
  END IF;
  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'الرسالة طويلة جداً (الحد الأقصى 2000 حرف)';
  END IF;
  IF p_type NOT IN ('info', 'warning', 'error', 'success') THEN
    RAISE EXCEPTION 'نوع إشعار غير صالح';
  END IF;
  IF p_link IS NOT NULL AND length(p_link) > 500 THEN
    RAISE EXCEPTION 'الرابط طويل جداً';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT b.user_id, p_title, p_message, p_type, p_link
  FROM public.beneficiaries b
  WHERE b.user_id IS NOT NULL;
END;
$$;

-- 3) تشديد log_access_event بإضافة حدود طول
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
BEGIN
  -- التحقق من المدخلات
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'نوع الحدث مطلوب';
  END IF;
  IF p_event_type NOT IN ('login_success', 'login_failed', 'logout', 'idle_logout', 'unauthorized_access', 'signup_attempt') THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;
  IF p_email IS NOT NULL AND length(p_email) > 320 THEN
    RAISE EXCEPTION 'البريد الإلكتروني طويل جداً';
  END IF;
  IF p_target_path IS NOT NULL AND length(p_target_path) > 500 THEN
    RAISE EXCEPTION 'المسار طويل جداً';
  END IF;

  INSERT INTO public.access_log (event_type, email, user_id, target_path, ip_info, metadata)
  VALUES (p_event_type, p_email, p_user_id, p_target_path, p_ip_info, p_metadata);
END;
$$;
