
CREATE OR REPLACE FUNCTION public.get_support_stats()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT json_build_object(
    'totalTickets', (SELECT count(*) FROM support_tickets),
    'openTickets', (SELECT count(*) FROM support_tickets WHERE status = 'open'),
    'inProgressTickets', (SELECT count(*) FROM support_tickets WHERE status = 'in_progress'),
    'resolvedTickets', (SELECT count(*) FROM support_tickets WHERE status IN ('resolved', 'closed')),
    'highPriorityTickets', (SELECT count(*) FROM support_tickets WHERE priority IN ('high', 'critical')),
    'ticketsLast7d', (SELECT count(*) FROM support_tickets WHERE created_at >= now() - interval '7 days'),
    'totalErrors', (SELECT count(*) FROM access_log WHERE event_type = 'client_error'),
    'errorsLast24h', (SELECT count(*) FROM access_log WHERE event_type = 'client_error' AND created_at >= now() - interval '24 hours'),
    'errorsLast7d', (SELECT count(*) FROM access_log WHERE event_type = 'client_error' AND created_at >= now() - interval '7 days')
  );
$$;
