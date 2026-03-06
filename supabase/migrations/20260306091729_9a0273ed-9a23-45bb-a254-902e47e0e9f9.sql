-- Fix check_rate_limit race condition: on CONFLICT should increment, not reset
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  -- تنظيف عشوائي للسجلات القديمة (1% من الاستدعاءات)
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  -- محاولة جلب السجل الحالي مع قفل
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- سجل جديد — race-safe: on conflict INCREMENT instead of resetting
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET count = rate_limits.count + 1;
    RETURN false;
  END IF;

  -- إذا انتهت النافذة الزمنية، إعادة تعيين
  IF now() > v_window_start + (p_window_seconds || ' seconds')::interval THEN
    UPDATE rate_limits SET count = 1, window_start = now() WHERE key = p_key;
    RETURN false;
  END IF;

  -- زيادة العداد
  UPDATE rate_limits SET count = v_count + 1 WHERE key = p_key;

  -- إرجاع true إذا تجاوز الحد
  RETURN (v_count + 1) > p_limit;
END;
$function$;