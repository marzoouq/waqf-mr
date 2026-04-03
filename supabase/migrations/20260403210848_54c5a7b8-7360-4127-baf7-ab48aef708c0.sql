CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'user_role',
    (auth.jwt() -> 'app_metadata' ->> 'user_role')
  )
$$;