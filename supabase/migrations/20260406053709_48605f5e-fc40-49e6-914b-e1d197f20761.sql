-- Drop the overly broad policy
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;

-- Replace with role-restricted read policy
CREATE POLICY "Role-based users can view invoices"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'accountant'::public.app_role)
    OR has_role(auth.uid(), 'beneficiary'::public.app_role)
    OR has_role(auth.uid(), 'waqif'::public.app_role)
  )
);