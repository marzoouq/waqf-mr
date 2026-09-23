-- إغلاق نهائي: لا سياسة قراءة (SELECT) على حزمة invoices إطلاقاً.
-- التنزيل حصراً عبر Edge Function `invoice-file-url` بعد تحقق الدور والسنة المالية.
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view waqf assets" ON storage.objects;
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Beneficiaries and waqif can view invoice files" ON storage.objects;

-- حارس ترحيل: يفشل الترحيل إن بقيت أي سياسة SELECT تلمس حزمة invoices.
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
    RAISE EXCEPTION 'سياسات قراءة مفتوحة على حزمة invoices ما زالت قائمة: %', leftover;
  END IF;
END $$;