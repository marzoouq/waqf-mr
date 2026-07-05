-- إزالة سياسات storage.objects القديمة/المكررة التي تكشف ملفات الفواتير
-- idempotent: تُطبَّق بأمان على أي بيئة سواء وُجدت أم لا.

DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Role-based users can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoice files" ON storage.objects;