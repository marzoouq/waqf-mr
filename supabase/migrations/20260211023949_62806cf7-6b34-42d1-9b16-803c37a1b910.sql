
-- Fix beneficiaries: remove waqif access to all beneficiaries, only own data + admin
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data"
ON public.beneficiaries FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix expenses: restrict to admin and waqif only
DROP POLICY IF EXISTS "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Admin and waqif can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'waqif'::app_role));
