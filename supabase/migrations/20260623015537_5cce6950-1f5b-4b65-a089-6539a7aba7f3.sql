GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rate_limit_count(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_by_national_id(text) TO anon, authenticated;