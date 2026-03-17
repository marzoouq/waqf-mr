-- إضافة سياسة UPDATE للمحاسب على ملفات الفواتير
CREATE POLICY "Accountants can update invoices"
  ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'accountant'::public.app_role));
