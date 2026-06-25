DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;

CREATE POLICY "Admin and accountant can view invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices'
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  )
);