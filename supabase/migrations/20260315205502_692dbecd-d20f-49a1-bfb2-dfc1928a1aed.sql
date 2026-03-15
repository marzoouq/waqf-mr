
-- SEC-1: منع المستفيدين والواقف من الوصول المباشر لجدول contracts
-- يجب استخدام contracts_safe فقط

DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;

CREATE POLICY "Authorized roles can view contracts"
ON public.contracts
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- E-2: جدول الميزانيات التقديرية للمصروفات
CREATE TABLE IF NOT EXISTS public.expense_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_year_id uuid REFERENCES public.fiscal_years(id) ON DELETE CASCADE NOT NULL,
  expense_type text NOT NULL,
  budget_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fiscal_year_id, expense_type)
);

ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage expense_budgets"
ON public.expense_budgets FOR ALL TO public
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage expense_budgets"
ON public.expense_budgets FOR ALL TO public
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authorized roles can view expense_budgets"
ON public.expense_budgets FOR SELECT TO public
USING (
  has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);
