
-- ═══════════════════════════════════════════════════════════
-- إصلاح أمني: تقييد وصول waqif/beneficiary للبيانات الحساسة
-- ═══════════════════════════════════════════════════════════

-- 1. إعادة إنشاء beneficiaries_safe بـ SECURITY DEFINER
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
WITH (security_barrier = true)
AS
SELECT
  id,
  name,
  share_percentage,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN national_id
    ELSE CASE WHEN national_id IS NOT NULL THEN '********'::text ELSE NULL::text END
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN bank_account
    ELSE CASE WHEN bank_account IS NOT NULL THEN '********'::text ELSE NULL::text END
  END AS bank_account,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN email
    ELSE CASE WHEN email IS NOT NULL THEN '***@***'::text ELSE NULL::text END
  END AS email,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN phone
    ELSE CASE WHEN phone IS NOT NULL THEN '********'::text ELSE NULL::text END
  END AS phone,
  notes,
  user_id,
  created_at,
  updated_at
FROM public.beneficiaries;

-- جعل العرض SECURITY DEFINER (يعمل بصلاحيات المالك)
ALTER VIEW public.beneficiaries_safe SET (security_invoker = false);

-- 2. إعادة إنشاء contracts_safe بـ SECURITY DEFINER
DROP VIEW IF EXISTS public.contracts_safe;
CREATE VIEW public.contracts_safe
WITH (security_barrier = true)
AS
SELECT
  id,
  contract_number,
  tenant_name,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_id_number ELSE NULL::text
  END AS tenant_id_number,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_id_type ELSE NULL::text
  END AS tenant_id_type,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_tax_number ELSE NULL::text
  END AS tenant_tax_number,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_crn ELSE NULL::text
  END AS tenant_crn,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_street ELSE NULL::text
  END AS tenant_street,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_district ELSE NULL::text
  END AS tenant_district,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_city ELSE NULL::text
  END AS tenant_city,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_postal_code ELSE NULL::text
  END AS tenant_postal_code,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
      THEN tenant_building ELSE NULL::text
  END AS tenant_building,
  property_id,
  unit_id,
  start_date,
  end_date,
  rent_amount,
  payment_type,
  payment_count,
  payment_amount,
  status,
  notes,
  fiscal_year_id,
  created_at,
  updated_at
FROM public.contracts;

ALTER VIEW public.contracts_safe SET (security_invoker = false);

-- 3. منح SELECT على العروض لـ authenticated
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;

-- سحب أي صلاحيات من anon و public
REVOKE ALL ON public.beneficiaries_safe FROM anon, PUBLIC;
REVOKE ALL ON public.contracts_safe FROM anon, PUBLIC;

-- 4. تعديل RLS على beneficiaries: إزالة waqif من سياسة SELECT
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data"
  ON public.beneficiaries
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 5. تعديل RLS على contracts: إزالة beneficiary و waqif من سياسة SELECT
DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;
CREATE POLICY "Authorized roles can view contracts"
  ON public.contracts
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );
