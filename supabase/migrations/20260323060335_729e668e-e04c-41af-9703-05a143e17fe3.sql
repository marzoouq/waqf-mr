
-- ============================================================
-- توحيد نهائي للعروض الآمنة — حسم الانجراف
-- ============================================================

-- 1) beneficiaries_safe — SECURITY DEFINER مع تقنيع PII
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
WITH (security_invoker = false, security_barrier = true)
AS
SELECT
  b.id,
  b.name,
  b.share_percentage,
  b.created_at,
  b.updated_at,
  b.user_id,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN b.national_id ELSE NULL END AS national_id,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN b.bank_account ELSE NULL END AS bank_account,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN b.email ELSE NULL END AS email,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN b.phone ELSE NULL END AS phone,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN b.notes ELSE NULL END AS notes
FROM public.beneficiaries b
WHERE auth.uid() IS NOT NULL;

REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC;
REVOKE ALL ON public.beneficiaries_safe FROM anon;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- 2) contracts_safe — SECURITY DEFINER مع تقنيع PII
DROP VIEW IF EXISTS public.contracts_safe;
CREATE VIEW public.contracts_safe
WITH (security_invoker = false, security_barrier = true)
AS
SELECT
  c.id, c.contract_number, c.property_id, c.unit_id,
  c.tenant_name, c.start_date, c.end_date,
  c.rent_amount, c.payment_type, c.payment_count, c.payment_amount,
  c.status, c.fiscal_year_id,
  c.created_at, c.updated_at,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_id_type ELSE NULL END AS tenant_id_type,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_id_number ELSE NULL END AS tenant_id_number,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_tax_number ELSE NULL END AS tenant_tax_number,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_crn ELSE NULL END AS tenant_crn,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_street ELSE NULL END AS tenant_street,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_building ELSE NULL END AS tenant_building,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_district ELSE NULL END AS tenant_district,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_city ELSE NULL END AS tenant_city,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.tenant_postal_code ELSE NULL END AS tenant_postal_code,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
       THEN c.notes ELSE NULL END AS notes
FROM public.contracts c
WHERE auth.uid() IS NOT NULL;

REVOKE ALL ON public.contracts_safe FROM PUBLIC;
REVOKE ALL ON public.contracts_safe FROM anon;
GRANT SELECT ON public.contracts_safe TO authenticated;
