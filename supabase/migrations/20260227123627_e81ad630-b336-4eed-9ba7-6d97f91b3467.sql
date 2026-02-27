
-- جدول تخصيص العقود للسنوات المالية
CREATE TABLE public.contract_fiscal_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  fiscal_year_id uuid NOT NULL REFERENCES public.fiscal_years(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  allocated_payments int NOT NULL DEFAULT 0,
  allocated_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(contract_id, fiscal_year_id)
);

-- Enable RLS
ALTER TABLE public.contract_fiscal_allocations ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins can manage contract_fiscal_allocations"
ON public.contract_fiscal_allocations
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Accountant full access
CREATE POLICY "Accountants can manage contract_fiscal_allocations"
ON public.contract_fiscal_allocations
FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

-- Beneficiary/Waqif read only with fiscal year restriction
CREATE POLICY "Authorized roles can view contract_fiscal_allocations"
ON public.contract_fiscal_allocations
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'beneficiary')
  OR public.has_role(auth.uid(), 'waqif')
);

CREATE POLICY "Restrict unpublished fiscal year data on contract_fiscal_allocations"
ON public.contract_fiscal_allocations
FOR SELECT
USING (public.is_fiscal_year_accessible(fiscal_year_id));

-- Index for performance
CREATE INDEX idx_cfa_contract_id ON public.contract_fiscal_allocations(contract_id);
CREATE INDEX idx_cfa_fiscal_year_id ON public.contract_fiscal_allocations(fiscal_year_id);
