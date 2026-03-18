
-- =====================================================
-- إصلاح SECURITY DEFINER Views → SECURITY INVOKER
-- يضيف سياسات SELECT الناقصة على الجداول الأساسية أولاً
-- ثم يعيد إنشاء العروض بـ security_invoker=true
-- =====================================================

-- 1) إضافة سياسة SELECT للواقف على جدول beneficiaries
-- (الواقف يرى الأسماء والنسب عبر العرض، PII مقنّعة بالـ CASE)
CREATE POLICY "Waqif can view beneficiaries"
  ON public.beneficiaries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'waqif'::app_role));

-- 2) إضافة سياسة SELECT للمستفيد والواقف على جدول contracts
-- (حالياً فقط admin/accountant يملكون SELECT)
DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;
CREATE POLICY "Authorized roles can view contracts"
  ON public.contracts FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 3) إعادة إنشاء beneficiaries_safe بـ security_invoker=true
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
WITH (security_invoker=true, security_barrier=true) AS
SELECT
  id,
  name,
  share_percentage,
  user_id,
  created_at,
  updated_at,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN national_id
    WHEN user_id = auth.uid() THEN national_id
    ELSE '***'::text
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN bank_account
    WHEN user_id = auth.uid() THEN bank_account
    ELSE '***'::text
  END AS bank_account,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN email
    WHEN user_id = auth.uid() THEN email
    ELSE '***'::text
  END AS email,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN phone
    WHEN user_id = auth.uid() THEN phone
    ELSE '***'::text
  END AS phone,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN notes
    WHEN user_id = auth.uid() THEN notes
    ELSE '***'::text
  END AS notes
FROM public.beneficiaries;

-- 4) إعادة إنشاء contracts_safe بـ security_invoker=true
DROP VIEW IF EXISTS public.contracts_safe;
CREATE VIEW public.contracts_safe
WITH (security_invoker=true, security_barrier=true) AS
SELECT
  id,
  property_id,
  unit_id,
  start_date,
  end_date,
  rent_amount,
  payment_count,
  payment_amount,
  fiscal_year_id,
  created_at,
  updated_at,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_crn ELSE NULL::text END AS tenant_crn,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_street ELSE NULL::text END AS tenant_street,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_district ELSE NULL::text END AS tenant_district,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_city ELSE NULL::text END AS tenant_city,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_building ELSE NULL::text END AS tenant_building,
  payment_type,
  status,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN notes ELSE NULL::text END AS notes,
  contract_number,
  tenant_name,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_id_number ELSE NULL::text END AS tenant_id_number,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_id_type ELSE NULL::text END AS tenant_id_type
FROM public.contracts;

-- 5) ضبط الصلاحيات على العروض
REVOKE ALL ON public.beneficiaries_safe FROM anon;
REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

REVOKE ALL ON public.contracts_safe FROM anon;
REVOKE ALL ON public.contracts_safe FROM PUBLIC;
GRANT SELECT ON public.contracts_safe TO authenticated;
