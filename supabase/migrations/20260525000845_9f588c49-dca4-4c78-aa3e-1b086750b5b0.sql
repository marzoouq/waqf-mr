BEGIN;

CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = off, security_barrier = true)
AS
SELECT
  c.id, c.property_id, c.unit_id, c.start_date, c.end_date,
  c.rent_amount, c.payment_count, c.payment_amount,
  c.fiscal_year_id, c.created_at, c.updated_at,
  c.status, c.contract_number, c.payment_type,
  CASE WHEN r.is_privileged THEN c.tenant_name        ELSE '***'::text END AS tenant_name,
  CASE WHEN r.is_privileged THEN c.tenant_id_type     ELSE NULL::text END AS tenant_id_type,
  CASE WHEN r.is_privileged THEN c.tenant_id_number   ELSE NULL::text END AS tenant_id_number,
  CASE WHEN r.is_privileged THEN c.tenant_tax_number  ELSE NULL::text END AS tenant_tax_number,
  CASE WHEN r.is_privileged THEN c.tenant_crn         ELSE NULL::text END AS tenant_crn,
  CASE WHEN r.is_privileged THEN c.tenant_street      ELSE NULL::text END AS tenant_street,
  CASE WHEN r.is_privileged THEN c.tenant_building    ELSE NULL::text END AS tenant_building,
  CASE WHEN r.is_privileged THEN c.tenant_district    ELSE NULL::text END AS tenant_district,
  CASE WHEN r.is_privileged THEN c.tenant_city        ELSE NULL::text END AS tenant_city,
  CASE WHEN r.is_privileged THEN c.tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
  CASE WHEN r.is_privileged THEN c.notes              ELSE NULL::text END AS notes
FROM public.contracts c
CROSS JOIN LATERAL (
  SELECT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'accountant'::public.app_role)
  ) AS is_privileged
) r
WHERE auth.uid() IS NOT NULL
  AND (r.is_privileged OR public.is_fiscal_year_accessible(c.fiscal_year_id));

REVOKE ALL ON TABLE public.contracts_safe FROM PUBLIC;
REVOKE ALL ON TABLE public.contracts_safe FROM anon;
REVOKE ALL ON TABLE public.contracts_safe FROM authenticated;
GRANT  SELECT ON TABLE public.contracts_safe TO authenticated;
GRANT  SELECT ON TABLE public.contracts_safe TO service_role;

COMMENT ON VIEW public.contracts_safe IS
'Intentional SECURITY DEFINER view. Enforces auth.uid(), role checks (admin/accountant see full data; others see only accessible fiscal years with PII masked), and SELECT-only grants. See docs/security/views.md.';

COMMIT;