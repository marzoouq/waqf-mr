
-- دالة مساعدة للتحقق من إمكانية الوصول للسنة المالية
CREATE OR REPLACE FUNCTION public.is_fiscal_year_accessible(p_fiscal_year_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') THEN true
    WHEN p_fiscal_year_id IS NULL THEN true
    ELSE EXISTS (
      SELECT 1 FROM public.fiscal_years
      WHERE id = p_fiscal_year_id AND published = true
    )
  END;
$$;

-- سياسة تقييدية على contracts
CREATE POLICY "Restrict unpublished fiscal year data on contracts"
ON public.contracts
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- سياسة تقييدية على income
CREATE POLICY "Restrict unpublished fiscal year data on income"
ON public.income
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- سياسة تقييدية على expenses
CREATE POLICY "Restrict unpublished fiscal year data on expenses"
ON public.expenses
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- سياسة تقييدية على invoices
CREATE POLICY "Restrict unpublished fiscal year data on invoices"
ON public.invoices
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (public.is_fiscal_year_accessible(fiscal_year_id));
