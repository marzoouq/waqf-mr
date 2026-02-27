
-- جدول rate_limits لتتبع معدل الطلبات عبر كل instances
CREATE TABLE public.rate_limits (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL DEFAULT now()
);

-- تفعيل RLS مع حظر الوصول المباشر (يُستخدم فقط عبر service role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to rate_limits"
  ON public.rate_limits FOR ALL
  USING (false);

-- دالة فحص وتحديث rate limit ذرياً
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  -- محاولة جلب السجل الحالي مع قفل
  SELECT count, window_start INTO v_count, v_window_start
  FROM rate_limits WHERE key = p_key FOR UPDATE;

  IF NOT FOUND THEN
    -- سجل جديد
    INSERT INTO rate_limits (key, count, window_start)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET count = 1, window_start = now();
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
$$;
