DROP VIEW IF EXISTS public.contracts_safe CASCADE;

CREATE VIEW public.contracts_safe
WITH (security_invoker = off) AS
SELECT
  c.id,
  c.property_id,
  c.unit_id,
  c.start_date,
  c.end_date,
  c.rent_amount,
  c.payment_count,
  c.payment_amount,
  c.fiscal_year_id,
  c.created_at,
  c.updated_at,
  c.status,
  c.contract_number,
  c.payment_type,
  c.tenant_name,
  CASE WHEN r.is_privileged THEN c.tenant_id_type ELSE NULL::text END AS tenant_id_type,
  CASE WHEN r.is_privileged THEN c.tenant_id_number ELSE NULL::text END AS tenant_id_number,
  CASE WHEN r.is_privileged THEN c.tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
  CASE WHEN r.is_privileged THEN c.tenant_crn ELSE NULL::text END AS tenant_crn,
  CASE WHEN r.is_privileged THEN c.tenant_street ELSE NULL::text END AS tenant_street,
  CASE WHEN r.is_privileged THEN c.tenant_building ELSE NULL::text END AS tenant_building,
  CASE WHEN r.is_privileged THEN c.tenant_district ELSE NULL::text END AS tenant_district,
  CASE WHEN r.is_privileged THEN c.tenant_city ELSE NULL::text END AS tenant_city,
  CASE WHEN r.is_privileged THEN c.tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
  c.notes
FROM public.contracts c
CROSS JOIN LATERAL (
  SELECT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) AS is_privileged
) r;

GRANT SELECT ON public.contracts_safe TO authenticated;
