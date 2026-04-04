-- Fix jwt_role() to ONLY read from app_metadata (not top-level JWT claim)
-- This prevents privilege escalation via user-controlled JWT claims
CREATE OR REPLACE FUNCTION public.jwt_role()
 RETURNS text
 LANGUAGE sql
 STABLE PARALLEL SAFE
 SET search_path TO 'public'
AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'user_role')
$$;

-- Ensure permissions are maintained
GRANT EXECUTE ON FUNCTION public.jwt_role() TO anon;
GRANT EXECUTE ON FUNCTION public.jwt_role() TO authenticated;