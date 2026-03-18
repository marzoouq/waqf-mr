
-- ============================================================
-- الجولة 12: سحب صلاحيات PII + تقنيع notes في contracts_safe
-- ============================================================

-- 1. سحب صلاحيات دوال PII من authenticated (دفاع متعدد الطبقات)
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_pii_key() FROM authenticated;

-- 2. إعادة إنشاء contracts_safe مع تقنيع notes
CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = true, security_barrier = true)
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
    CASE
        WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
        THEN c.notes ELSE NULL::text
    END AS notes,
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
FROM contracts c
WHERE auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  )
  AND is_fiscal_year_accessible(c.fiscal_year_id);

-- 3. ضمان الصلاحيات على الـ view
REVOKE ALL ON public.contracts_safe FROM anon;
GRANT SELECT ON public.contracts_safe TO authenticated;
