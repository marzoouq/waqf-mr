-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Beneficiaries can create advance_requests" ON public.advance_requests;

-- Recreate with fiscal year validation
CREATE POLICY "Beneficiaries can create advance_requests"
ON public.advance_requests
FOR INSERT
TO public
WITH CHECK (
  (beneficiary_id IN (
    SELECT beneficiaries.id
    FROM beneficiaries
    WHERE beneficiaries.user_id = auth.uid()
  ))
  AND (status = 'pending'::text)
  AND (fiscal_year_id IS NOT NULL)
  AND (EXISTS (
    SELECT 1 FROM fiscal_years
    WHERE fiscal_years.id = advance_requests.fiscal_year_id
      AND fiscal_years.status = 'active'
  ))
);