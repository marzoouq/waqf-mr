
-- حذف السياسة القديمة التي تسمح لكل المستخدمين المسجلين
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;

-- إنشاء سياسة جديدة مقيّدة بالأدوار الإدارية فقط
CREATE POLICY "Admin and accountant can view invoices"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'invoices'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'accountant')
  )
);
