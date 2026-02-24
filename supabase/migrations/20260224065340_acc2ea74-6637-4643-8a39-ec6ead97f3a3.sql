
-- Fix 1: Add role check inside notify_all_beneficiaries
CREATE OR REPLACE FUNCTION public.notify_all_beneficiaries(p_title text, p_message text, p_type text DEFAULT 'info'::text, p_link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- التحقق من صلاحية المستدعي: الناظر أو المحاسب فقط
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بإرسال إشعارات جماعية';
  END IF;

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
$function$;

-- Fix 1b: Add role check inside notify_admins
CREATE OR REPLACE FUNCTION public.notify_admins(p_title text, p_message text, p_type text DEFAULT 'info'::text, p_link text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- التحقق من صلاحية المستدعي: الناظر أو المحاسب فقط
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بإرسال إشعارات للمشرفين';
  END IF;

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
$function$;
