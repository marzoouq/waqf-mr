
-- تحسين contracts_safe و beneficiaries_safe باستخدام CROSS JOIN LATERAL
-- لتقليل استدعاءات has_role من 20+ إلى 2 فقط

CREATE OR REPLACE VIEW public.contracts_safe AS
SELECT c.id,
    c.contract_number,
    c.property_id,
    c.unit_id,
    c.tenant_name,
    c.start_date,
    c.end_date,
    c.rent_amount,
    c.payment_type,
    c.payment_count,
    c.payment_amount,
    c.status,
    c.fiscal_year_id,
    c.created_at,
    c.updated_at,
    CASE WHEN r.is_privileged THEN c.tenant_id_type ELSE NULL::text END AS tenant_id_type,
    CASE WHEN r.is_privileged THEN c.tenant_id_number ELSE NULL::text END AS tenant_id_number,
    CASE WHEN r.is_privileged THEN c.tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
    CASE WHEN r.is_privileged THEN c.tenant_crn ELSE NULL::text END AS tenant_crn,
    CASE WHEN r.is_privileged THEN c.tenant_street ELSE NULL::text END AS tenant_street,
    CASE WHEN r.is_privileged THEN c.tenant_building ELSE NULL::text END AS tenant_building,
    CASE WHEN r.is_privileged THEN c.tenant_district ELSE NULL::text END AS tenant_district,
    CASE WHEN r.is_privileged THEN c.tenant_city ELSE NULL::text END AS tenant_city,
    CASE WHEN r.is_privileged THEN c.tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
    CASE WHEN r.is_privileged THEN c.notes ELSE NULL::text END AS notes
FROM contracts c
CROSS JOIN LATERAL (
    SELECT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) AS is_privileged
) r
WHERE auth.uid() IS NOT NULL;

CREATE OR REPLACE VIEW public.beneficiaries_safe AS
SELECT b.id,
    b.name,
    b.share_percentage,
    b.created_at,
    b.updated_at,
    b.user_id,
    CASE WHEN r.is_privileged THEN b.national_id ELSE NULL::text END AS national_id,
    CASE WHEN r.is_privileged THEN b.bank_account ELSE NULL::text END AS bank_account,
    CASE WHEN r.is_privileged THEN b.email ELSE NULL::text END AS email,
    CASE WHEN r.is_privileged THEN b.phone ELSE NULL::text END AS phone,
    CASE WHEN r.is_privileged THEN b.notes ELSE NULL::text END AS notes
FROM beneficiaries b
CROSS JOIN LATERAL (
    SELECT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) AS is_privileged
) r
WHERE auth.uid() IS NOT NULL;
