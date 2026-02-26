
-- جدول ترحيل الفروق السالبة للسُلف بين السنوات المالية
CREATE TABLE public.advance_carryforward (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beneficiary_id UUID NOT NULL REFERENCES public.beneficiaries(id) ON DELETE CASCADE,
  from_fiscal_year_id UUID NOT NULL REFERENCES public.fiscal_years(id),
  to_fiscal_year_id UUID REFERENCES public.fiscal_years(id),
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.advance_carryforward ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان
CREATE POLICY "Admins can manage advance_carryforward"
  ON public.advance_carryforward FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can manage advance_carryforward"
  ON public.advance_carryforward FOR ALL
  USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Beneficiaries can view own carryforward"
  ON public.advance_carryforward FOR SELECT
  USING (beneficiary_id IN (
    SELECT id FROM public.beneficiaries WHERE user_id = auth.uid()
  ));

-- فهرس للبحث السريع
CREATE INDEX idx_advance_carryforward_beneficiary ON public.advance_carryforward(beneficiary_id);
CREATE INDEX idx_advance_carryforward_from_fy ON public.advance_carryforward(from_fiscal_year_id);
