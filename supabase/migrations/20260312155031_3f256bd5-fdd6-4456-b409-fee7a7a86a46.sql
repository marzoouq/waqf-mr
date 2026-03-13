-- Fix: Change PERMISSIVE to RESTRICTIVE for fiscal year restriction on payment_invoices
DROP POLICY IF EXISTS "Restrict unpublished fiscal year data on payment_invoices" ON public.payment_invoices;
CREATE POLICY "Restrict unpublished fiscal year data on payment_invoices"
  ON public.payment_invoices
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- Fix: Change PERMISSIVE to RESTRICTIVE for fiscal year restriction on contract_fiscal_allocations
DROP POLICY IF EXISTS "Restrict unpublished fiscal year data on contract_fiscal_alloca" ON public.contract_fiscal_allocations;
CREATE POLICY "Restrict unpublished fiscal year data on contract_fiscal_allocations"
  ON public.contract_fiscal_allocations
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- Fix: Recreate beneficiaries_safe view with SECURITY INVOKER to respect RLS
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe WITH (security_invoker = true) AS
SELECT
  id,
  name,
  share_percentage,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN national_id
    ELSE CASE WHEN national_id IS NOT NULL THEN '********'::text ELSE NULL::text END
  END AS national_id,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN bank_account
    ELSE CASE WHEN bank_account IS NOT NULL THEN '********'::text ELSE NULL::text END
  END AS bank_account,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN email
    ELSE CASE WHEN email IS NOT NULL THEN '***@***'::text ELSE NULL::text END
  END AS email,
  CASE
    WHEN (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN phone
    ELSE CASE WHEN phone IS NOT NULL THEN '********'::text ELSE NULL::text END
  END AS phone,
  notes,
  user_id,
  created_at,
  updated_at
FROM public.beneficiaries;