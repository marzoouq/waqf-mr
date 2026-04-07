-- حذف سياسات الكتابة من العميل لجدول zatca_certificates
-- Edge Functions تستخدم service_role الذي يتجاوز RLS تلقائياً
DROP POLICY IF EXISTS "Admins can insert zatca_certificates" ON zatca_certificates;
DROP POLICY IF EXISTS "Admins can update zatca_certificates" ON zatca_certificates;
DROP POLICY IF EXISTS "Admins can delete zatca_certificates" ON zatca_certificates;