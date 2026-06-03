DROP POLICY IF EXISTS "Anyone can view waqf assets" ON storage.objects;

CREATE POLICY "Authenticated can list waqf assets"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'waqf-assets');