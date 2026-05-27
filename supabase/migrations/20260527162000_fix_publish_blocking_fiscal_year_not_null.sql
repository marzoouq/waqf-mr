BEGIN;

-- Enforce fiscal year linkage only where Live has no NULL values.
ALTER TABLE public.contracts
  ALTER COLUMN fiscal_year_id SET NOT NULL;

ALTER TABLE public.advance_requests
  ALTER COLUMN fiscal_year_id SET NOT NULL;

ALTER TABLE public.invoices
  ALTER COLUMN fiscal_year_id SET NOT NULL;

-- TODO: Enforce NOT NULL on public.payment_invoices.fiscal_year_id after
-- the 2026-2027 fiscal year is created and future-dated invoices are backfilled.

-- Harden disbursement_vouchers_public with caller-side RLS and explicit role guard.
CREATE OR REPLACE VIEW public.disbursement_vouchers_public
WITH (security_invoker = true) AS
SELECT
  id,
  voucher_number,
  expense_id,
  fiscal_year_id,
  recipient_name,
  amount,
  payment_method,
  work_description,
  status,
  approved_at,
  created_at,
  pdf_path
FROM public.disbursement_vouchers
WHERE status = 'approved'::voucher_status
  AND public.is_fiscal_year_accessible(fiscal_year_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

REVOKE ALL ON TABLE public.disbursement_vouchers_public FROM PUBLIC;
REVOKE ALL ON TABLE public.disbursement_vouchers_public FROM anon;
GRANT SELECT ON TABLE public.disbursement_vouchers_public TO authenticated;
GRANT SELECT ON TABLE public.disbursement_vouchers_public TO service_role;

COMMENT ON VIEW public.disbursement_vouchers_public IS
  'Security-invoker approved-voucher view. It relies on the caller role and exposes only non-PII voucher fields to authenticated operational roles.';

-- Add composite index on rate_limits for faster window lookups.
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON public.rate_limits (key, window_start DESC);

COMMIT;
