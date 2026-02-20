
-- 1. إنشاء دالة آمنة لتسجيل أحداث الوصول (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_path text DEFAULT NULL,
  p_ip_info text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- التحقق من صحة نوع الحدث (منع إدخال بيانات عشوائية)
  IF p_event_type NOT IN ('login_failed', 'login_success', 'unauthorized_access', 'idle_logout') THEN
    RAISE EXCEPTION 'نوع حدث غير صالح: %', p_event_type;
  END IF;

  -- تقييد طول البيانات لمنع إساءة الاستخدام
  IF length(coalesce(p_email, '')) > 255 THEN
    RAISE EXCEPTION 'البريد الإلكتروني طويل جداً';
  END IF;

  IF length(coalesce(p_ip_info, '')) > 500 THEN
    p_ip_info := left(p_ip_info, 500);
  END IF;

  INSERT INTO public.access_log (event_type, email, user_id, target_path, ip_info, metadata)
  VALUES (p_event_type, p_email, p_user_id, p_target_path, p_ip_info, p_metadata);
END;
$$;

-- 2. منح صلاحية تنفيذ الدالة للمستخدمين المجهولين والمصادقين
GRANT EXECUTE ON FUNCTION public.log_access_event TO anon, authenticated;

-- 3. إزالة سياسة INSERT المفتوحة (الخطر الأمني)
DROP POLICY IF EXISTS "Anyone can insert access_log" ON public.access_log;

-- 4. إضافة سياسة INSERT مقيدة (تمنع الإدراج المباشر - فقط عبر الدالة)
CREATE POLICY "No direct inserts on access_log"
ON public.access_log
FOR INSERT
WITH CHECK (false);
