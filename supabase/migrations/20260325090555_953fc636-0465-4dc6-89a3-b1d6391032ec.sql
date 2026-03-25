
-- دالة فحص الاستعلامات البطيئة وإرسال إشعار للناظرين
CREATE OR REPLACE FUNCTION public.cron_check_slow_queries()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slow_count integer;
  v_details text;
BEGIN
  -- جلب الاستعلامات التي تجاوز متوسطها 5 ثوانٍ
  SELECT 
    count(*),
    string_agg(
      format('• %s ms (استُدعي %s مرة)', round(mean_exec_time::numeric, 0), calls),
      E'\n'
      ORDER BY mean_exec_time DESC
    )
  INTO v_slow_count, v_details
  FROM pg_stat_statements
  WHERE mean_exec_time > 5000
    AND calls > 0
    AND dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
    AND userid != 16384; -- تجاهل superuser

  IF v_slow_count > 0 THEN
    PERFORM notify_admins(
      'تنبيه أداء',
      format('تم رصد %s استعلام بطيء (أكثر من 5 ثوانٍ):%s%s', v_slow_count, E'\n', COALESCE(left(v_details, 500), '')),
      'warning',
      '/dashboard/diagnostics'
    );
  END IF;
END;
$$;

-- سحب صلاحية التنفيذ من العموم
REVOKE EXECUTE ON FUNCTION public.cron_check_slow_queries() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_check_slow_queries() FROM anon;
REVOKE EXECUTE ON FUNCTION public.cron_check_slow_queries() FROM authenticated;
