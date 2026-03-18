BEGIN;

-- Harden safe views so they are read-only surfaces for authenticated users.
-- This fixes the effective exposure pattern without relying on view RLS (which does not apply to views).

REVOKE ALL ON TABLE public.beneficiaries_safe FROM PUBLIC;
REVOKE ALL ON TABLE public.beneficiaries_safe FROM anon;
REVOKE ALL ON TABLE public.beneficiaries_safe FROM authenticated;
GRANT SELECT ON TABLE public.beneficiaries_safe TO authenticated;

REVOKE ALL ON TABLE public.contracts_safe FROM PUBLIC;
REVOKE ALL ON TABLE public.contracts_safe FROM anon;
REVOKE ALL ON TABLE public.contracts_safe FROM authenticated;
GRANT SELECT ON TABLE public.contracts_safe TO authenticated;

-- Defense in depth: keep service roles functional.
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.beneficiaries_safe TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public.contracts_safe TO service_role;

COMMENT ON VIEW public.beneficiaries_safe IS 'Security-invoker safe view. Authenticated users have SELECT only; row filtering is enforced by base table RLS on public.beneficiaries.';
COMMENT ON VIEW public.contracts_safe IS 'Security-invoker safe view. Authenticated users have SELECT only; row filtering is enforced by base table RLS on public.contracts.';

COMMIT;