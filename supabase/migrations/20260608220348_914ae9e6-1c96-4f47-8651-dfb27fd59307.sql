-- Add restrictive policy to ensure ALL operations on disbursement_vouchers
-- (INSERT/UPDATE/DELETE) are also scoped to accessible fiscal years.
-- The existing restrictive SELECT policy only covered reads; writes lacked the same guard.

DROP POLICY IF EXISTS "Restrict unpublished fy on disbursement_vouchers" ON public.disbursement_vouchers;

CREATE POLICY "Restrict unpublished fy on disbursement_vouchers"
ON public.disbursement_vouchers
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (public.is_fiscal_year_accessible(fiscal_year_id))
WITH CHECK (public.is_fiscal_year_accessible(fiscal_year_id));
