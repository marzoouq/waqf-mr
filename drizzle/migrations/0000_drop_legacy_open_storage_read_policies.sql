-- إسقاط سياسات القراءة المفتوحة القديمة على storage.objects (ما زالت قائمة في الإنتاج).
-- قراءة ملفات الفواتير حصراً عبر Edge Function `invoice-file-url`؛
-- وحزمة waqf-assets عامة على مستوى الحزمة فلا حاجة لسياسة قراءة واسعة.
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view waqf assets" ON storage.objects;