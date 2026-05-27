CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_path text DEFAULT NULL,
  p_device_info text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
  v_metadata jsonb;
  v_rate_key text;
  v_window_start timestamptz;
  v_count integer;
  v_limit integer := 60; -- max events per window
  v_window interval := interval '1 minute';
BEGIN
  -- التحقق من نوع الحدث (قائمة بيضاء صارمة)
  IF p_event_type NOT IN (
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch','client_error',
    'session_expired','diagnostics_run'
  ) THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;

  v_caller := auth.uid();

  -- منع انتحال الهوية
  IF p_user_id IS NOT NULL AND v_caller IS NOT NULL AND p_user_id != v_caller THEN
    RAISE EXCEPTION 'لا يمكن تسجيل حدث باسم مستخدم آخر';
  END IF;

  -- تحديد البيانات الوصفية وحدّ حجمها (≤ 4KB)
  v_metadata := COALESCE(p_metadata, '{}'::jsonb);
  IF pg_column_size(v_metadata) > 4096 THEN
    v_metadata := jsonb_build_object('truncated', true);
  END IF;

  -- تحديد معدل الاستدعاء (rate limit) — أولوية للمتصل المجهول
  v_rate_key := 'log_access_event:' || p_event_type || ':' ||
                COALESCE(v_caller::text, LEFT(COALESCE(p_email, 'anon'), 64));

  v_window_start := date_trunc('minute', now());

  INSERT INTO public.rate_limits AS rl (key, count, window_start)
  VALUES (v_rate_key, 1, v_window_start)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE
                  WHEN rl.window_start < v_window_start THEN 1
                  ELSE rl.count + 1
                END,
        window_start = CASE
                         WHEN rl.window_start < v_window_start THEN v_window_start
                         ELSE rl.window_start
                       END
  RETURNING count INTO v_count;

  IF v_count > v_limit THEN
    -- ابتلاع صامت: لا نُفشل تدفق المستخدم، لكن لا نسجّل
    RETURN;
  END IF;

  INSERT INTO public.access_log (
    event_type, email, user_id, target_path, device_info, metadata
  ) VALUES (
    p_event_type,
    LEFT(p_email, 320),
    COALESCE(v_caller, p_user_id),
    LEFT(p_target_path, 500),
    LEFT(p_device_info, 500),
    v_metadata
  );
END;
$function$;

-- ضمان وجود قيد فريد على rate_limits.key لعمل ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rate_limits_key_key' AND conrelid = 'public.rate_limits'::regclass
  ) THEN
    ALTER TABLE public.rate_limits ADD CONSTRAINT rate_limits_key_key UNIQUE (key);
  END IF;
END $$;