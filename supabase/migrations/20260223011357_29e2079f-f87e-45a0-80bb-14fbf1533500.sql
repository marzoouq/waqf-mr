
-- 1. إضافة قيد UNIQUE على contract_number
ALTER TABLE public.contracts ADD CONSTRAINT unique_contract_number UNIQUE (contract_number);

-- 2. تحديث سياسة عرض accounts لتشمل المحاسب
DROP POLICY IF EXISTS "Authorized roles can view accounts" ON public.accounts;
CREATE POLICY "Authorized roles can view accounts"
ON public.accounts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'beneficiary'::app_role) OR
  has_role(auth.uid(), 'waqif'::app_role) OR
  has_role(auth.uid(), 'accountant'::app_role)
);

-- 3. تحديث سياسة عرض audit_log لتشمل المحاسب (موجودة بالفعل لكن للتأكد)
-- Already exists from previous migration

-- 4. إضافة accountant لسياسة fiscal_years SELECT
DROP POLICY IF EXISTS "Authorized roles can view fiscal_years" ON public.fiscal_years;
CREATE POLICY "Authorized roles can view fiscal_years"
ON public.fiscal_years
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'beneficiary'::app_role) OR
  has_role(auth.uid(), 'waqif'::app_role) OR
  has_role(auth.uid(), 'accountant'::app_role)
);
