-- إزالة سياسة وصول المحاسبين للمفاتيح الخاصة في zatca_certificates
-- المحاسبون لا يحتاجون الوصول المباشر للمفاتيح — العمليات تتم عبر Edge Functions
DROP POLICY IF EXISTS "Accountants can view zatca_certificates" ON public.zatca_certificates;
