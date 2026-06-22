-- F15: Consolidate duplicate SELECT policies on storage.objects invoices bucket
-- Keep only "Role-based users can view invoices" as single source of truth
DROP POLICY IF EXISTS "Admin and accountant can view invoice files" ON storage.objects;
DROP POLICY IF EXISTS "Admin and accountant can view invoices" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read invoices" ON storage.objects;
DROP POLICY IF EXISTS "Accountants can read invoices" ON storage.objects;
-- Defensive re-drop (already executed earlier but ensures parity)
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;