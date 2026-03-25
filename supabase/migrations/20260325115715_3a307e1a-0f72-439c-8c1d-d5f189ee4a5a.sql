
-- إضافة عمود تاريخ انتهاء الصلاحية للشهادات
ALTER TABLE public.zatca_certificates ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- دالة فحص انتهاء صلاحية شهادة ZATCA وإرسال إشعار للمدراء
CREATE OR REPLACE FUNCTION cron_check_zatca_cert_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at timestamptz;
  v_days_left integer;
  v_already_notified boolean;
BEGIN
  -- جلب تاريخ انتهاء الشهادة النشطة
  SELECT expires_at INTO v_expires_at
  FROM zatca_certificates
  WHERE is_active = true AND expires_at IS NOT NULL
  LIMIT 1;

  IF v_expires_at IS NULL THEN RETURN; END IF;

  v_days_left := EXTRACT(DAY FROM (v_expires_at - now()))::integer;

  -- إرسال إشعار فقط إذا بقي أقل من 14 يوماً ولم يُنتهِ بعد
  IF v_days_left > 14 OR v_days_left < 0 THEN RETURN; END IF;

  -- تجنب التكرار: لا نرسل إشعاراً إذا أُرسل واحد خلال آخر 24 ساعة
  SELECT EXISTS (
    SELECT 1 FROM notifications
    WHERE title = 'تنبيه: شهادة ZATCA تقارب انتهاء الصلاحية'
    AND created_at > now() - interval '24 hours'
  ) INTO v_already_notified;

  IF v_already_notified THEN RETURN; END IF;

  PERFORM notify_admins(
    p_title := 'تنبيه: شهادة ZATCA تقارب انتهاء الصلاحية',
    p_message := 'شهادة ZATCA النشطة ستنتهي خلال ' || v_days_left || ' يوماً. يرجى تجديدها من إعدادات ZATCA لضمان استمرار إرسال الفواتير.',
    p_type := 'warning',
    p_link := '/settings'
  );
END;
$$;

-- سحب صلاحيات التنفيذ العامة
REVOKE EXECUTE ON FUNCTION cron_check_zatca_cert_expiry() FROM public;
REVOKE EXECUTE ON FUNCTION cron_check_zatca_cert_expiry() FROM anon;
REVOKE EXECUTE ON FUNCTION cron_check_zatca_cert_expiry() FROM authenticated;
