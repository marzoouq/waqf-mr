
-- Restrict direct access to beneficiaries_safe view via grants
-- Revoke from anon (no anonymous access to PII view)
REVOKE ALL ON public.beneficiaries_safe FROM anon;

-- Ensure only authenticated users can access (RLS on underlying beneficiaries table filters rows)
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- Set security_barrier to prevent optimizer leaking data through filter pushdown
ALTER VIEW public.beneficiaries_safe SET (security_barrier = true);
