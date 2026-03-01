-- إصلاح: تقييد صلاحية المحاسب على fiscal_years إلى INSERT و SELECT فقط (بدون UPDATE/DELETE)
DROP POLICY IF EXISTS "Accountants can insert fiscal_years" ON public.fiscal_years;

-- المحاسب يمكنه فقط إنشاء سنوات مالية جديدة وعرضها (لا يمكنه إقفالها أو حذفها)
CREATE POLICY "Accountants can insert fiscal_years"
ON public.fiscal_years
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'accountant'::app_role));