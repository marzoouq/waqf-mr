
-- ═══════════════════════════════════════════════════════════════
-- مركز التشخيص والأمان للناظر — RPCs قراءة فقط
-- كل الدوال SECURITY DEFINER + has_role('admin') guard
-- ═══════════════════════════════════════════════════════════════

-- 1) ملخص محاولات الاختراق ومحاولات الدخول الفاشلة
CREATE OR REPLACE FUNCTION public.admin_intrusion_summary(p_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_failed_logins integer;
  v_unauthorized integer;
  v_rls_violations integer;
  v_client_errors integer;
  v_top_emails jsonb;
  v_top_paths jsonb;
  v_role_changes integer;
  v_since timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  v_since := now() - make_interval(hours => GREATEST(1, LEAST(p_hours, 720)));

  SELECT count(*) INTO v_failed_logins
  FROM public.access_log
  WHERE event_type = 'login_failed' AND created_at >= v_since;

  SELECT count(*) INTO v_unauthorized
  FROM public.access_log
  WHERE event_type = 'unauthorized_access' AND created_at >= v_since;

  SELECT count(*) INTO v_rls_violations
  FROM public.access_log
  WHERE event_type = 'client_error'
    AND created_at >= v_since
    AND (metadata->>'code' = '42501' OR metadata->>'message' ILIKE '%row-level security%');

  SELECT count(*) INTO v_client_errors
  FROM public.access_log
  WHERE event_type = 'client_error' AND created_at >= v_since;

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.cnt DESC), '[]'::jsonb) INTO v_top_emails
  FROM (
    SELECT email, count(*)::int AS cnt
    FROM public.access_log
    WHERE event_type = 'login_failed' AND created_at >= v_since AND email IS NOT NULL
    GROUP BY email
    ORDER BY count(*) DESC
    LIMIT 10
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.cnt DESC), '[]'::jsonb) INTO v_top_paths
  FROM (
    SELECT target_path AS path, count(*)::int AS cnt
    FROM public.access_log
    WHERE event_type IN ('client_error','unauthorized_access')
      AND created_at >= v_since AND target_path IS NOT NULL
    GROUP BY target_path
    ORDER BY count(*) DESC
    LIMIT 10
  ) t;

  SELECT count(*) INTO v_role_changes
  FROM public.audit_log
  WHERE table_name = 'user_roles' AND created_at >= v_since;

  RETURN jsonb_build_object(
    'since', v_since,
    'hours', p_hours,
    'failed_logins', v_failed_logins,
    'unauthorized_access', v_unauthorized,
    'rls_violations', v_rls_violations,
    'client_errors', v_client_errors,
    'role_changes', v_role_changes,
    'top_failed_emails', v_top_emails,
    'top_error_paths', v_top_paths
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_intrusion_summary(integer) TO authenticated;

-- 2) إحصائيات قاعدة البيانات (اتصالات + حجم)
CREATE OR REPLACE FUNCTION public.admin_db_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_active_conns integer;
  v_total_conns integer;
  v_max_conns integer;
  v_db_size_bytes bigint;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  SELECT count(*) INTO v_active_conns
  FROM pg_stat_activity WHERE state = 'active';

  SELECT count(*) INTO v_total_conns FROM pg_stat_activity;

  SELECT setting::int INTO v_max_conns FROM pg_settings WHERE name = 'max_connections';

  SELECT pg_database_size(current_database()) INTO v_db_size_bytes;

  RETURN jsonb_build_object(
    'active_connections', v_active_conns,
    'total_connections', v_total_conns,
    'max_connections', v_max_conns,
    'saturation_pct', round((v_total_conns::numeric / NULLIF(v_max_conns,0)::numeric) * 100, 1),
    'db_size_bytes', v_db_size_bytes,
    'db_size_mb', round((v_db_size_bytes::numeric / 1024 / 1024), 2),
    'measured_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_db_stats() TO authenticated;

-- 3) إحصائيات Edge Functions من access_log
CREATE OR REPLACE FUNCTION public.admin_edge_functions_stats(p_hours integer DEFAULT 24)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_since timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  v_since := now() - make_interval(hours => GREATEST(1, LEAST(p_hours, 720)));

  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.total DESC), '[]'::jsonb) INTO v_result
  FROM (
    SELECT
      coalesce(metadata->>'function', metadata->>'edge_function', 'unknown') AS function_name,
      count(*)::int AS total,
      sum(CASE WHEN event_type = 'client_error' OR (metadata->>'status')::int >= 400 THEN 1 ELSE 0 END)::int AS errors,
      round(avg(NULLIF((metadata->>'duration_ms')::numeric, 0)), 0) AS avg_ms
    FROM public.access_log
    WHERE created_at >= v_since
      AND (metadata ? 'function' OR metadata ? 'edge_function')
    GROUP BY 1
    ORDER BY count(*) DESC
    LIMIT 30
  ) t;

  RETURN jsonb_build_object('since', v_since, 'hours', p_hours, 'functions', v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_edge_functions_stats(integer) TO authenticated;

-- 4) تغييرات الأدوار الأخيرة (SETOF)
CREATE OR REPLACE FUNCTION public.admin_recent_role_changes(p_hours integer DEFAULT 168)
RETURNS TABLE (
  id uuid,
  operation text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT a.id, a.operation, a.record_id, a.old_data, a.new_data, a.user_id, a.created_at
  FROM public.audit_log a
  WHERE a.table_name = 'user_roles'
    AND a.created_at >= now() - make_interval(hours => GREATEST(1, LEAST(p_hours, 8760)))
  ORDER BY a.created_at DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_recent_role_changes(integer) TO authenticated;
