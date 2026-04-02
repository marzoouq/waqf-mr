-- Remove overly broad storage policy that lets ALL authenticated users read invoice files
-- Admin and accountant already have their own dedicated read policies
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;