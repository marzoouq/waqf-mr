DROP POLICY IF EXISTS "Admins can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;