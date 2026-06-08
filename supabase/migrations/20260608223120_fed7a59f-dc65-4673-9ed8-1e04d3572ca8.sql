-- Allow anon to call the pre-auth RPCs used by lookup-national-id edge function.
-- These functions are SECURITY DEFINER, return minimal data, and are protected by
-- application-level rate limiting + Luhn validation in the edge function.

GRANT EXECUTE ON FUNCTION public.lookup_by_national_id(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon;

-- New helper: read remaining rate-limit count without exposing the rate_limits table.
CREATE OR REPLACE FUNCTION public.get_rate_limit_count(p_key text)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT count FROM public.rate_limits WHERE key = p_key), 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_rate_limit_count(text) TO anon, authenticated, service_role;