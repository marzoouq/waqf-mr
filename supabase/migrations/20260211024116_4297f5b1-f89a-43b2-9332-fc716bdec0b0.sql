
-- Revert expenses policy to allow all authenticated users to view
DROP POLICY IF EXISTS "Admin and waqif can view expenses" ON public.expenses;
CREATE POLICY "Authenticated users can view expenses"
ON public.expenses FOR SELECT
TO authenticated
USING (true);
