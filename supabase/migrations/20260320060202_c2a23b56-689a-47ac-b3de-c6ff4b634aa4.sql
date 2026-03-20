-- المشكلة 1: حذف سياسة SELECT الفضفاضة على حزمة invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;

-- إضافة سياسة SELECT صريحة للأدمن
CREATE POLICY "Admins can read invoices" ON storage.objects
  FOR SELECT USING (bucket_id = 'invoices' AND public.has_role(auth.uid(), 'admin'));

-- المشكلة 2: تقييد أنواع الملفات المسموح برفعها
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['application/pdf','image/jpeg','image/png','image/webp']
WHERE id = 'invoices';