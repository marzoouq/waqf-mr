-- Fix: beneficiary SELECT policy must be PERMISSIVE (not RESTRICTIVE)
-- Currently RESTRICTIVE → no permissive policy passes for beneficiary → blocked

DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;

CREATE POLICY "Beneficiaries can view their own data"
ON public.beneficiaries
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'accountant')
);