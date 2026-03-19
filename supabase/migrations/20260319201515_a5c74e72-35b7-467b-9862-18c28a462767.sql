-- Step 1: Drop the overly broad SELECT policy on contracts
DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;

-- Step 2: Create restricted SELECT policy for admin+accountant only
CREATE POLICY "Admin and accountant can view contracts"
  ON public.contracts
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- Step 3: Switch contracts_safe to security_invoker=false
-- so beneficiary/waqif can still read via the view (bypassing contracts RLS)
-- while PII is masked by CASE WHEN inside the view
CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = false, security_barrier = true)
AS
SELECT
    id,
    property_id,
    unit_id,
    start_date,
    end_date,
    rent_amount,
    payment_count,
    payment_amount,
    fiscal_year_id,
    created_at,
    updated_at,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_crn ELSE NULL::text END AS tenant_crn,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_street ELSE NULL::text END AS tenant_street,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_district ELSE NULL::text END AS tenant_district,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_city ELSE NULL::text END AS tenant_city,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_building ELSE NULL::text END AS tenant_building,
    payment_type,
    status,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN notes ELSE NULL::text END AS notes,
    contract_number,
    tenant_name,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_id_number ELSE NULL::text END AS tenant_id_number,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_id_type ELSE NULL::text END AS tenant_id_type
FROM public.contracts;

-- Step 4: Ensure beneficiary/waqif can SELECT from the view
GRANT SELECT ON public.contracts_safe TO authenticated;

-- Step 5: Revoke direct SELECT on contracts from anon (defense in depth)
REVOKE SELECT ON public.contracts FROM anon;