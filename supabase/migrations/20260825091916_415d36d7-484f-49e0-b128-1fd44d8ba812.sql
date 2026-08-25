-- المرحلة 1: إغلاق نهائي لقراءة ملفات الفواتير من العميل
-- التنزيل يمرّ حصراً عبر Edge Function invoice-file-url (service role)

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Beneficiaries and waqif can view invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Public can view invoices" ON storage.objects;

-- حارس: يفشل الترحيل إن بقيت أي سياسة SELECT على حزمة الفواتير
DO $$
DECLARE
  leftover text;
BEGIN
  SELECT string_agg(policyname, ', ')
    INTO leftover
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND cmd = 'SELECT'
    AND coalesce(qual, '') LIKE '%invoices%';

  IF leftover IS NOT NULL THEN
    RAISE EXCEPTION 'سياسات قراءة غير مسموحة على حزمة الفواتير: %', leftover;
  END IF;
END $$;