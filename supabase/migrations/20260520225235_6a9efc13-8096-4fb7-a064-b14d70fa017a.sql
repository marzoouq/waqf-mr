-- إصلاح: عرض contracts_safe يعتمد security_invoker=on مع غياب سياسة SELECT للمستفيد/الواقف على جدول contracts
-- الحل: إعادة إنشاء العرض كـ security_invoker=off (يعمل بصلاحيات المالك postgres) مع فرض فحص is_fiscal_year_accessible داخلياً
-- بهذا يقرأ المستفيد/الواقف البيانات المُقنّعة من PII فقط عبر العرض، ولا يستطيع الوصول للجدول الأساس مباشرة.

DROP VIEW IF EXISTS public.contracts_safe;

CREATE VIEW public.contracts_safe
WITH (security_invoker = off, security_barrier = true) AS
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
  CASE WHEN r.is_privileged THEN c.tenant_name ELSE '***' END AS tenant_name,
  CASE WHEN r.is_privileged THEN c.tenant_id_type ELSE NULL END AS tenant_id_type,
  CASE WHEN r.is_privileged THEN c.tenant_id_number ELSE NULL END AS tenant_id_number,
  CASE WHEN r.is_privileged THEN c.tenant_tax_number ELSE NULL END AS tenant_tax_number,
  CASE WHEN r.is_privileged THEN c.tenant_crn ELSE NULL END AS tenant_crn,
  CASE WHEN r.is_privileged THEN c.tenant_street ELSE NULL END AS tenant_street,
  CASE WHEN r.is_privileged THEN c.tenant_building ELSE NULL END AS tenant_building,
  CASE WHEN r.is_privileged THEN c.tenant_district ELSE NULL END AS tenant_district,
  CASE WHEN r.is_privileged THEN c.tenant_city ELSE NULL END AS tenant_city,
  CASE WHEN r.is_privileged THEN c.tenant_postal_code ELSE NULL END AS tenant_postal_code,
  CASE WHEN r.is_privileged THEN c.notes ELSE NULL END AS notes
FROM public.contracts c
CROSS JOIN LATERAL (
  SELECT (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  ) AS is_privileged
) r
WHERE
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'accountant'::app_role)
  OR public.is_fiscal_year_accessible(c.fiscal_year_id);

GRANT SELECT ON public.contracts_safe TO authenticated;