
CREATE OR REPLACE FUNCTION public.get_support_analytics()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'category_stats', COALESCE((
      SELECT json_agg(json_build_object('key', category, 'count', cnt))
      FROM (SELECT category, count(*)::int AS cnt FROM support_tickets GROUP BY category ORDER BY cnt DESC) sub
    ), '[]'::json),
    'priority_stats', COALESCE((
      SELECT json_agg(json_build_object('key', priority, 'count', cnt))
      FROM (SELECT priority, count(*)::int AS cnt FROM support_tickets GROUP BY priority ORDER BY cnt DESC) sub
    ), '[]'::json),
    'avg_resolution_hours', COALESCE((
      SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1)
      FROM support_tickets WHERE resolved_at IS NOT NULL
    ), 0),
    'avg_rating', COALESCE((
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM support_tickets WHERE rating IS NOT NULL
    ), 0),
    'rated_count', (SELECT count(*)::int FROM support_tickets WHERE rating IS NOT NULL),
    'total_count', (SELECT count(*)::int FROM support_tickets)
  );
$$;
