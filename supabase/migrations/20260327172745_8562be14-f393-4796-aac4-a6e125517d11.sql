
CREATE OR REPLACE FUNCTION public.get_support_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'totalTickets', t.total,
    'openTickets', t.open_count,
    'inProgressTickets', t.in_progress_count,
    'resolvedTickets', t.resolved_count,
    'highPriorityTickets', t.high_priority_count,
    'ticketsLast7d', t.last_7d_count,
    'totalErrors', e.total_errors,
    'errorsLast24h', e.errors_24h,
    'errorsLast7d', e.errors_7d
  )
  FROM (
    SELECT
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE status = 'open') AS open_count,
      COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
      COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) AS resolved_count,
      COUNT(*) FILTER (WHERE priority IN ('high', 'critical')) AS high_priority_count,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7d_count
    FROM support_tickets
  ) t,
  (
    SELECT
      COUNT(*) AS total_errors,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS errors_24h,
      COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS errors_7d
    FROM access_log
    WHERE event_type = 'client_error'
  ) e;
$$;
