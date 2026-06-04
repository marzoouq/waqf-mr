-- 1) Remove overly permissive invoices bucket read policy
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON storage.objects;

-- 2) Remove accountant ability to create fiscal years
DROP POLICY IF EXISTS "Accountants can insert fiscal_years" ON public.fiscal_years;