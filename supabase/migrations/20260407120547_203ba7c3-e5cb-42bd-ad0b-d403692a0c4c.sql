
-- Block all direct SELECT on the raw table
DROP POLICY IF EXISTS "Admins can read zatca_certificates" ON public.zatca_certificates;
CREATE POLICY "No direct client reads on zatca_certificates"
  ON public.zatca_certificates FOR SELECT TO authenticated
  USING (false);

-- Recreate view as SECURITY DEFINER so it bypasses table RLS
DROP VIEW IF EXISTS public.zatca_certificates_safe;
CREATE VIEW public.zatca_certificates_safe
  WITH (security_invoker = false, security_barrier = true)
AS
SELECT
  id,
  certificate_type,
  is_active,
  request_id,
  created_at,
  expires_at
FROM public.zatca_certificates
WHERE has_role(auth.uid(), 'admin'::app_role);

GRANT SELECT ON public.zatca_certificates_safe TO authenticated;
REVOKE SELECT ON public.zatca_certificates_safe FROM anon;
REVOKE SELECT ON public.zatca_certificates_safe FROM public;
