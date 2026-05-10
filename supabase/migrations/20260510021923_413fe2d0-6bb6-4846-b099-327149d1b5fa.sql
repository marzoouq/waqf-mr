CREATE POLICY "Beneficiaries and waqif can view contracts"
ON public.contracts FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'beneficiary'::app_role)
  OR has_role(auth.uid(),'waqif'::app_role)
);