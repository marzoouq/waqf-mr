CREATE POLICY "Beneficiaries and waqif can view invoice files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  )
  AND EXISTS (
    SELECT 1 FROM public.invoices i
    WHERE i.file_path = storage.objects.name
      AND is_fiscal_year_accessible(i.fiscal_year_id)
  )
);