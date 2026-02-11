
-- 1. Fix income table: restrict SELECT to admin, waqif, beneficiary only
DROP POLICY IF EXISTS "Authenticated users can view income" ON public.income;

CREATE POLICY "Authorized roles can view income"
ON public.income
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
);

-- 2. Fix contracts table: restrict SELECT to admin, waqif, beneficiary only
DROP POLICY IF EXISTS "Authenticated users can view contracts" ON public.contracts;

CREATE POLICY "Authorized roles can view contracts"
ON public.contracts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
);
