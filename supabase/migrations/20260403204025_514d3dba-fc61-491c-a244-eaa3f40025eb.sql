-- دالة تجميع الدخل حسب المصدر
CREATE OR REPLACE FUNCTION public.get_income_summary_by_source(p_fiscal_year_id uuid)
RETURNS TABLE(source text, total_amount numeric, record_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    i.source,
    SUM(i.amount) AS total_amount,
    COUNT(*) AS record_count
  FROM public.income i
  WHERE i.fiscal_year_id = p_fiscal_year_id
  GROUP BY i.source
  ORDER BY total_amount DESC;
$$;

-- دالة تجميع المصروفات حسب النوع
CREATE OR REPLACE FUNCTION public.get_expense_summary_by_type(p_fiscal_year_id uuid)
RETURNS TABLE(expense_type text, total_amount numeric, record_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.expense_type,
    SUM(e.amount) AS total_amount,
    COUNT(*) AS record_count
  FROM public.expenses e
  WHERE e.fiscal_year_id = p_fiscal_year_id
  GROUP BY e.expense_type
  ORDER BY total_amount DESC;
$$;