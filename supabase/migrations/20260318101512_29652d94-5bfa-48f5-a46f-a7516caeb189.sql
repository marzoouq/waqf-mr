-- Fix functional access regression on safe views.
-- Root cause: security_invoker=true makes views inherit base-table RLS,
-- which blocks beneficiary/waqif paths on contracts and narrows beneficiaries visibility.

-- 1) Recreate contracts_safe without security_invoker.
DROP VIEW IF EXISTS public.contracts_safe;

CREATE VIEW public.contracts_safe
WITH (security_barrier = true)
AS
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
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_tax_number ELSE NULL::text
  END AS tenant_tax_number,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_crn ELSE NULL::text
  END AS tenant_crn,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_street ELSE NULL::text
  END AS tenant_street,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_district ELSE NULL::text
  END AS tenant_district,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_city ELSE NULL::text
  END AS tenant_city,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_postal_code ELSE NULL::text
  END AS tenant_postal_code,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_building ELSE NULL::text
  END AS tenant_building,
  c.payment_type,
  c.status,
  c.notes,
  c.contract_number,
  c.tenant_name,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_id_number ELSE NULL::text
  END AS tenant_id_number,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    THEN c.tenant_id_type ELSE NULL::text
  END AS tenant_id_type
FROM public.contracts c
WHERE
  auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  )
  AND is_fiscal_year_accessible(c.fiscal_year_id);

-- 2) Recreate beneficiaries_safe without security_invoker.
--    WHERE clause added: row-level filter so users only see what their role allows.
DROP VIEW IF EXISTS public.beneficiaries_safe;

CREATE VIEW public.beneficiaries_safe
WITH (security_barrier = true)
AS
SELECT
  b.id,
  b.name,
  b.share_percentage,
  b.user_id,
  b.created_at,
  b.updated_at,
  '***'::text AS bank_account,
  '***'::text AS email,
  '***'::text AS national_id,
  '***'::text AS notes,
  '***'::text AS phone
FROM public.beneficiaries b
WHERE
  auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR b.user_id = auth.uid()
  );

-- 3) Hard reset grants (deny anon/public, allow authenticated + service_role).
REVOKE ALL ON public.contracts_safe    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.contracts_safe    TO authenticated;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
GRANT SELECT ON public.contracts_safe    TO service_role;
GRANT SELECT ON public.beneficiaries_safe TO service_role;