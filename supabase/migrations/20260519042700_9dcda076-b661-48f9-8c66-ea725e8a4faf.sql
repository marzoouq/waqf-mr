-- Remove the SELECT policy on raw contracts table for beneficiary/waqif roles.
-- Those roles must use the contracts_safe view which masks tenant PII
-- (tenant_id_number, tenant_tax_number, tenant_crn, address fields).
DROP POLICY IF EXISTS "Beneficiaries and waqif can view contracts" ON public.contracts;