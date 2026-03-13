
-- إزالة السياسة المكررة التي لا تضيف حماية
DROP POLICY IF EXISTS "Beneficiaries view contracts via safe view only" ON public.contracts;

-- إعادة السياسة الأصلية مع المستفيدين (مطلوبة لعمل contracts_safe مع SECURITY INVOKER)
DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;
CREATE POLICY "Authorized roles can view contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'waqif'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- الحماية الفعلية: سحب SELECT المباشر على أعمدة المستأجرين الحساسة من الأدوار غير الإدارية
-- PostgreSQL لا تدعم column-level RLS لكن تدعم column-level GRANT
-- نسحب كل الصلاحيات ونعيد منحها بشكل انتقائي

-- أولاً: سحب SELECT العام على contracts
REVOKE SELECT ON public.contracts FROM authenticated;

-- ثانياً: منح SELECT على الأعمدة غير الحساسة فقط لـ authenticated
GRANT SELECT (
  id, property_id, unit_id, contract_number, tenant_name, 
  start_date, end_date, rent_amount, payment_count, payment_amount, 
  payment_type, status, notes, fiscal_year_id, created_at, updated_at
) ON public.contracts TO authenticated;

-- ثالثاً: منح SELECT على كل الأعمدة لـ service_role (للوظائف الخلفية)
GRANT SELECT ON public.contracts TO service_role;
