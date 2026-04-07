-- Drop the old overly-permissive storage SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;