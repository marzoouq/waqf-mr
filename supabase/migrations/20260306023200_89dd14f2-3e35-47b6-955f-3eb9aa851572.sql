-- FIX #1: إضافة 'client_error' و 'logout' لـ log_access_event
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL::text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_target_path text DEFAULT NULL::text,
  p_device_info text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
BEGIN
  -- التحقق من نوع الحدث
  IF p_event_type NOT IN (
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch','client_error'
  ) THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;

  -- الحصول على هوية المستدعي الفعلية
  v_caller := auth.uid();

  -- إذا تم تمرير p_user_id يجب أن يطابق المستدعي الفعلي (منع انتحال الهوية)
  IF p_user_id IS NOT NULL AND v_caller IS NOT NULL AND p_user_id != v_caller THEN
    RAISE EXCEPTION 'لا يمكن تسجيل حدث باسم مستخدم آخر';
  END IF;

  INSERT INTO public.access_log (
    event_type, email, user_id, target_path, device_info, metadata
  ) VALUES (
    p_event_type,
    p_email,
    COALESCE(v_caller, p_user_id),
    p_target_path,
    p_device_info,
    p_metadata
  );
END;
$function$;

-- FIX #2: جدولة cron لجميع الدوال
SELECT cron.schedule('expire-contracts-daily',   '0 1 * * *',  $$SELECT public.cron_auto_expire_contracts()$$);
SELECT cron.schedule('check-expiry-daily',       '0 8 * * *',  $$SELECT public.cron_check_contract_expiry()$$);
SELECT cron.schedule('late-payments-weekly',     '0 9 * * 1',  $$SELECT public.cron_check_late_payments()$$);
SELECT cron.schedule('cleanup-notifs-weekly',    '0 2 * * 0',  $$SELECT public.cron_cleanup_old_notifications()$$);
SELECT cron.schedule('archive-logs-monthly',     '0 3 1 * *',  $$SELECT public.cron_archive_old_access_logs()$$);

-- FIX #3: تنظيف rate_limits أسبوعياً
SELECT cron.schedule('cleanup-rate-limits-weekly', '0 4 * * 0', $$DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day'$$);