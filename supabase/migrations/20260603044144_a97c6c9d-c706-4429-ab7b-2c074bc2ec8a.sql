DROP POLICY IF EXISTS "Authenticated can list waqf assets" ON storage.objects;

CREATE POLICY "Privileged can list waqf assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'waqf-assets'
    AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
  );