CREATE POLICY waqf_docs_select_admin ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'waqf-documents'
    AND (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'accountant'::app_role))
  );

CREATE POLICY waqf_docs_select_published ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'waqf-documents'
    AND (has_role(auth.uid(),'beneficiary'::app_role) OR has_role(auth.uid(),'waqif'::app_role))
    AND EXISTS (
      SELECT 1 FROM public.archived_documents d
      WHERE d.storage_path = storage.objects.name
        AND d.is_published = true
    )
  );

CREATE POLICY waqf_docs_insert_admin ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'waqf-documents'
    AND has_role(auth.uid(),'admin'::app_role)
  );

CREATE POLICY waqf_docs_update_admin ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'waqf-documents'
    AND has_role(auth.uid(),'admin'::app_role)
  );

CREATE POLICY waqf_docs_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'waqf-documents'
    AND has_role(auth.uid(),'admin'::app_role)
  );