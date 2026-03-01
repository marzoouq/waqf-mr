-- Fix: allow beneficiaries to see ALL beneficiary names/percentages through the safe view
-- The view already masks PII (national_id, bank_account, email, phone)
-- Setting security_invoker = false makes the view bypass the underlying table's RLS
ALTER VIEW public.beneficiaries_safe SET (security_invoker = false);