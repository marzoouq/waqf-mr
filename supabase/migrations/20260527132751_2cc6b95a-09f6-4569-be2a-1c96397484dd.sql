-- Wave 2: enforce NOT NULL on fiscal_year_id where 0 NULLs exist
ALTER TABLE public.contracts        ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.advance_requests ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.invoices         ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.payment_invoices ALTER COLUMN fiscal_year_id SET NOT NULL;

-- Wave 3: harden disbursement_vouchers_public view with explicit role guard
DROP VIEW IF EXISTS public.disbursement_vouchers_public;
CREATE VIEW public.disbursement_vouchers_public
WITH (security_invoker = true) AS
SELECT id, voucher_number, expense_id, fiscal_year_id, recipient_name,
       amount, payment_method, work_description, status,
       approved_at, created_at, pdf_path
FROM public.disbursement_vouchers
WHERE status = 'approved'::voucher_status
  AND public.is_fiscal_year_accessible(fiscal_year_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

REVOKE ALL ON public.disbursement_vouchers_public FROM PUBLIC;
REVOKE ALL ON public.disbursement_vouchers_public FROM anon;
GRANT SELECT ON public.disbursement_vouchers_public TO authenticated;

-- Wave 5: add composite index on rate_limits for faster window lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_window
  ON public.rate_limits (key, window_start DESC);