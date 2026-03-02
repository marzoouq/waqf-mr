-- إضافة سياسة RESTRICTIVE على distributions لمنع رؤية توزيعات السنوات غير المنشورة
CREATE POLICY "Restrict unpublished fiscal year data on distributions"
ON public.distributions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_fiscal_year_accessible(fiscal_year_id));