
-- 1. advance_requests: منع رؤية سلف سنوات غير منشورة
CREATE POLICY "Restrict unpublished fiscal year data on advance_requests"
  ON public.advance_requests
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- 2. advance_carryforward: منع رؤية ترحيل سنوات غير منشورة
CREATE POLICY "Restrict unpublished fiscal year data on advance_carryforward"
  ON public.advance_carryforward
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.is_fiscal_year_accessible(from_fiscal_year_id));

-- 3. expense_budgets: منع رؤية ميزانيات سنوات غير منشورة
CREATE POLICY "Restrict unpublished fiscal year data on expense_budgets"
  ON public.expense_budgets
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (public.is_fiscal_year_accessible(fiscal_year_id));
