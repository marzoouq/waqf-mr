
-- 1) توسيع سجل الوصول: عنوان الشبكة + معرّف الجلسة
ALTER TABLE public.access_log ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.access_log ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE public.access_log_archive ADD COLUMN IF NOT EXISTS ip_address text;
ALTER TABLE public.access_log_archive ADD COLUMN IF NOT EXISTS session_id text;

CREATE INDEX IF NOT EXISTS idx_access_log_user_created ON public.access_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_type_created ON public.access_log (event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_log_ip_created ON public.access_log (ip_address, created_at DESC);

-- 2) جدول العناوين المحجوبة
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  auto_blocked boolean NOT NULL DEFAULT true,
  blocked_by uuid,
  incident_count integer NOT NULL DEFAULT 1,
  last_event_type text,
  last_email text,
  expires_at timestamptz,
  released_at timestamptz,
  released_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blocked_ips TO authenticated;
GRANT ALL ON public.blocked_ips TO service_role;

ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_ips_admin_support_read" ON public.blocked_ips;
CREATE POLICY "blocked_ips_admin_support_read" ON public.blocked_ips
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'support'::app_role));

DROP TRIGGER IF EXISTS trg_blocked_ips_updated_at ON public.blocked_ips;
CREATE TRIGGER trg_blocked_ips_updated_at
  BEFORE UPDATE ON public.blocked_ips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON public.blocked_ips (ip_address) WHERE released_at IS NULL;

-- 3) توسيع القائمة البيضاء لأنواع الأحداث + تخزين IP/session
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
  v_metadata jsonb;
  v_rate_key text;
  v_window_start timestamptz;
  v_count integer;
  v_limit integer := 120;
  v_session text;
  v_ip text;
BEGIN
  IF p_event_type NOT IN (
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch','client_error',
    'session_expired','diagnostics_run','page_view','page_exit',
    'ip_blocked','ip_unblocked'
  ) THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;

  v_caller := auth.uid();

  IF p_user_id IS NOT NULL AND v_caller IS NOT NULL AND p_user_id != v_caller THEN
    RAISE EXCEPTION 'لا يمكن تسجيل حدث باسم مستخدم آخر';
  END IF;

  v_metadata := COALESCE(p_metadata, '{}'::jsonb);
  IF pg_column_size(v_metadata) > 4096 THEN
    v_metadata := jsonb_build_object('truncated', true);
  END IF;

  v_session := LEFT(NULLIF(v_metadata->>'session_id', ''), 64);
  v_ip := LEFT(NULLIF(v_metadata->>'ip_address', ''), 64);

  v_rate_key := 'log_access_event:' || p_event_type || ':' ||
                COALESCE(v_caller::text, LEFT(COALESCE(p_email, 'anon'), 64));

  v_window_start := date_trunc('minute', now());

  INSERT INTO public.rate_limits AS rl (key, count, window_start)
  VALUES (v_rate_key, 1, v_window_start)
  ON CONFLICT (key) DO UPDATE
    SET count = CASE WHEN rl.window_start < v_window_start THEN 1 ELSE rl.count + 1 END,
        window_start = CASE WHEN rl.window_start < v_window_start THEN v_window_start ELSE rl.window_start END
  RETURNING count INTO v_count;

  IF v_count > v_limit THEN
    RETURN;
  END IF;

  INSERT INTO public.access_log (
    event_type, email, user_id, target_path, device_info, metadata, ip_address, session_id
  ) VALUES (
    p_event_type,
    LEFT(p_email, 320),
    COALESCE(v_caller, p_user_id),
    LEFT(p_target_path, 500),
    LEFT(p_device_info, 500),
    v_metadata,
    v_ip,
    v_session
  );
END;
$function$;

-- 4) التقييم التلقائي والحجب
CREATE OR REPLACE FUNCTION public.evaluate_and_block_ip()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reason text;
  v_count integer;
BEGIN
  IF NEW.ip_address IS NULL OR NEW.event_type NOT IN ('login_failed','unauthorized_access','client_error') THEN
    RETURN NEW;
  END IF;

  -- الناظر والدعم الفني مستثنون من الحجب التلقائي
  IF NEW.user_id IS NOT NULL AND (
       public.has_role(NEW.user_id, 'admin'::app_role)
       OR public.has_role(NEW.user_id, 'support'::app_role)
     ) THEN
    RETURN NEW;
  END IF;

  IF NEW.event_type = 'login_failed' THEN
    SELECT count(*) INTO v_count FROM public.access_log
     WHERE ip_address = NEW.ip_address AND event_type = 'login_failed'
       AND created_at > now() - interval '10 minutes';
    IF v_count >= 5 THEN v_reason := 'محاولات دخول فاشلة متكررة (' || v_count || ' خلال 10 دقائق)'; END IF;

  ELSIF NEW.event_type = 'unauthorized_access' THEN
    SELECT count(*) INTO v_count FROM public.access_log
     WHERE ip_address = NEW.ip_address AND event_type = 'unauthorized_access'
       AND created_at > now() - interval '10 minutes';
    IF v_count >= 3 THEN v_reason := 'محاولات وصول غير مصرّح (' || v_count || ' خلال 10 دقائق)'; END IF;

  ELSE
    SELECT count(*) INTO v_count FROM public.access_log
     WHERE ip_address = NEW.ip_address AND event_type = 'client_error'
       AND created_at > now() - interval '5 minutes';
    IF v_count >= 20 THEN v_reason := 'تدفق أخطاء غير طبيعي (' || v_count || ' خلال 5 دقائق)'; END IF;
  END IF;

  IF v_reason IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.blocked_ips (ip_address, reason, auto_blocked, incident_count, last_event_type, last_email, expires_at)
  VALUES (NEW.ip_address, v_reason, true, v_count, NEW.event_type, NEW.email, now() + interval '24 hours')
  ON CONFLICT (ip_address) DO UPDATE
    SET incident_count = public.blocked_ips.incident_count + 1,
        reason = EXCLUDED.reason,
        last_event_type = EXCLUDED.last_event_type,
        last_email = EXCLUDED.last_email,
        released_at = NULL,
        released_by = NULL,
        expires_at = now() + interval '24 hours',
        updated_at = now();

  PERFORM public.notify_admins(
    'حجب عنوان IP تلقائياً',
    'تم حجب العنوان ' || NEW.ip_address || ' — ' || v_reason,
    'warning',
    '/dashboard/diagnostics'
  );

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_evaluate_and_block_ip ON public.access_log;
CREATE TRIGGER trg_evaluate_and_block_ip
  AFTER INSERT ON public.access_log
  FOR EACH ROW EXECUTE FUNCTION public.evaluate_and_block_ip();

-- 5) فحص الحجب
CREATE OR REPLACE FUNCTION public.is_ip_blocked(p_ip text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.blocked_ips
     WHERE ip_address = p_ip
       AND released_at IS NULL
       AND (expires_at IS NULL OR expires_at > now())
  )
$function$;

-- 6) قائمة العناوين المحجوبة (مع سجل الحوادث)
CREATE OR REPLACE FUNCTION public.admin_blocked_ips()
RETURNS TABLE (
  id uuid, ip_address text, reason text, auto_blocked boolean,
  incident_count integer, last_event_type text, last_email text,
  expires_at timestamptz, released_at timestamptz,
  created_at timestamptz, updated_at timestamptz,
  is_active boolean, recent_events bigint, distinct_emails bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT b.id, b.ip_address, b.reason, b.auto_blocked, b.incident_count,
         b.last_event_type, b.last_email, b.expires_at, b.released_at,
         b.created_at, b.updated_at,
         (b.released_at IS NULL AND (b.expires_at IS NULL OR b.expires_at > now())) AS is_active,
         (SELECT count(*) FROM public.access_log al WHERE al.ip_address = b.ip_address AND al.created_at > now() - interval '7 days') AS recent_events,
         (SELECT count(DISTINCT al.email) FROM public.access_log al WHERE al.ip_address = b.ip_address AND al.email IS NOT NULL) AS distinct_emails
    FROM public.blocked_ips b
   WHERE public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'support'::app_role)
   ORDER BY (b.released_at IS NULL) DESC, b.updated_at DESC
   LIMIT 500
$function$;

-- 7) حجب/فتح يدوي (الناظر فقط)
CREATE OR REPLACE FUNCTION public.admin_block_ip(p_ip text, p_reason text DEFAULT NULL, p_hours integer DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'غير مصرّح';
  END IF;
  IF p_ip IS NULL OR length(trim(p_ip)) = 0 THEN
    RAISE EXCEPTION 'عنوان IP غير صالح';
  END IF;

  INSERT INTO public.blocked_ips (ip_address, reason, auto_blocked, blocked_by, expires_at)
  VALUES (
    LEFT(trim(p_ip), 64),
    COALESCE(NULLIF(trim(COALESCE(p_reason, '')), ''), 'حجب يدوي من لوحة التحكم'),
    false, auth.uid(),
    CASE WHEN p_hours IS NULL THEN NULL ELSE now() + make_interval(hours => p_hours) END
  )
  ON CONFLICT (ip_address) DO UPDATE
    SET reason = EXCLUDED.reason,
        auto_blocked = false,
        blocked_by = auth.uid(),
        released_at = NULL,
        released_by = NULL,
        expires_at = EXCLUDED.expires_at,
        updated_at = now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_unblock_ip(p_ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'غير مصرّح';
  END IF;

  UPDATE public.blocked_ips
     SET released_at = now(), released_by = auth.uid(), expires_at = NULL, updated_at = now()
   WHERE ip_address = LEFT(trim(p_ip), 64);
END;
$function$;

-- 8) ملخص نشاط المستخدمين
CREATE OR REPLACE FUNCTION public.admin_user_activity_summary(p_days integer DEFAULT 30)
RETURNS TABLE (
  user_id uuid, email text, display_name text, roles text,
  sessions bigint, page_views bigint, distinct_paths bigint,
  total_seconds numeric, errors bigint,
  first_seen timestamptz, last_seen timestamptz, last_path text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH scope AS (
    SELECT al.* FROM public.access_log al
     WHERE al.created_at > now() - make_interval(days => GREATEST(COALESCE(p_days, 30), 1))
       AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'support'::app_role))
  )
  SELECT s.user_id,
         MAX(s.email) AS email,
         MAX(b.name) AS display_name,
         (SELECT string_agg(DISTINCT ur.role::text, ', ') FROM public.user_roles ur WHERE ur.user_id = s.user_id) AS roles,
         count(DISTINCT COALESCE(s.session_id, s.id::text)) FILTER (WHERE s.event_type = 'login_success') AS sessions,
         count(*) FILTER (WHERE s.event_type = 'page_view') AS page_views,
         count(DISTINCT s.target_path) FILTER (WHERE s.event_type = 'page_view') AS distinct_paths,
         COALESCE(SUM((s.metadata->>'duration_seconds')::numeric) FILTER (WHERE s.event_type = 'page_exit'), 0) AS total_seconds,
         count(*) FILTER (WHERE s.event_type IN ('client_error','unauthorized_access')) AS errors,
         MIN(s.created_at) AS first_seen,
         MAX(s.created_at) AS last_seen,
         (ARRAY_AGG(s.target_path ORDER BY s.created_at DESC) FILTER (WHERE s.target_path IS NOT NULL))[1] AS last_path
    FROM scope s
    LEFT JOIN public.beneficiaries b ON b.user_id = s.user_id
   WHERE s.user_id IS NOT NULL
   GROUP BY s.user_id
   ORDER BY MAX(s.created_at) DESC
   LIMIT 300
$function$;

-- 9) الخط الزمني الكامل لمستخدم (وصول + تعديلات بيانات)
CREATE OR REPLACE FUNCTION public.admin_user_timeline(p_user_id uuid, p_days integer DEFAULT 60, p_limit integer DEFAULT 500)
RETURNS TABLE (
  occurred_at timestamptz, source text, event_type text,
  target_path text, detail text, ip_address text, session_id text, device_info text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH allowed AS (
    SELECT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'support'::app_role)) AS ok
  ), access AS (
    SELECT al.created_at AS occurred_at, 'access'::text AS source, al.event_type,
           al.target_path,
           NULLIF(concat_ws(' · ',
             NULLIF(al.metadata->>'label', ''),
             CASE WHEN al.metadata->>'duration_seconds' IS NOT NULL
                  THEN 'المدة: ' || round((al.metadata->>'duration_seconds')::numeric) || 'ث' END,
             NULLIF(al.metadata->>'error_message', '')
           ), '') AS detail,
           al.ip_address, al.session_id, al.device_info
      FROM public.access_log al, allowed
     WHERE allowed.ok AND al.user_id = p_user_id
       AND al.created_at > now() - make_interval(days => GREATEST(COALESCE(p_days, 60), 1))
  ), audit AS (
    SELECT a.created_at AS occurred_at, 'audit'::text AS source,
           lower(a.operation) AS event_type,
           a.table_name AS target_path,
           a.table_name || ' (' || a.operation || ')' AS detail,
           NULL::text AS ip_address, NULL::text AS session_id, NULL::text AS device_info
      FROM public.audit_log a, allowed
     WHERE allowed.ok AND a.user_id = p_user_id
       AND a.created_at > now() - make_interval(days => GREATEST(COALESCE(p_days, 60), 1))
  )
  SELECT * FROM (SELECT * FROM access UNION ALL SELECT * FROM audit) t
   ORDER BY occurred_at DESC
   LIMIT LEAST(GREATEST(COALESCE(p_limit, 500), 1), 2000)
$function$;

-- 10) الجلسات النشطة الآن (آخر 15 دقيقة)
CREATE OR REPLACE FUNCTION public.admin_active_sessions(p_minutes integer DEFAULT 15)
RETURNS TABLE (
  user_id uuid, email text, display_name text, roles text,
  session_id text, current_path text, last_activity timestamptz,
  events bigint, ip_address text, device_info text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH scope AS (
    SELECT al.* FROM public.access_log al
     WHERE al.created_at > now() - make_interval(mins => GREATEST(COALESCE(p_minutes, 15), 1))
       AND al.user_id IS NOT NULL
       AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'support'::app_role))
  ), ranked AS (
    SELECT s.*, row_number() OVER (PARTITION BY s.user_id, COALESCE(s.session_id, '-') ORDER BY s.created_at DESC) AS rn
      FROM scope s
  )
  SELECT r.user_id,
         r.email,
         b.name AS display_name,
         (SELECT string_agg(DISTINCT ur.role::text, ', ') FROM public.user_roles ur WHERE ur.user_id = r.user_id) AS roles,
         r.session_id,
         r.target_path AS current_path,
         r.created_at AS last_activity,
         (SELECT count(*) FROM scope s2 WHERE s2.user_id = r.user_id AND COALESCE(s2.session_id, '-') = COALESCE(r.session_id, '-')) AS events,
         r.ip_address,
         r.device_info
    FROM ranked r
    LEFT JOIN public.beneficiaries b ON b.user_id = r.user_id
   WHERE r.rn = 1
   ORDER BY r.created_at DESC
   LIMIT 200
$function$;

REVOKE EXECUTE ON FUNCTION public.admin_blocked_ips() FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_block_ip(text, text, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_unblock_ip(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_user_activity_summary(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_user_timeline(uuid, integer, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_active_sessions(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_ip_blocked(text) FROM anon;
