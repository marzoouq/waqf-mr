CREATE POLICY "Restrict unpublished fiscal year data on invoice_items"
ON public.invoice_items
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_items.invoice_id
    AND invoice_items.invoice_source = 'invoices'
    AND is_fiscal_year_accessible(i.fiscal_year_id)
  )
  OR EXISTS (
    SELECT 1 FROM public.payment_invoices pi
    WHERE pi.id = invoice_items.invoice_id
    AND invoice_items.invoice_source = 'payment_invoices'
    AND is_fiscal_year_accessible(pi.fiscal_year_id)
  )
);