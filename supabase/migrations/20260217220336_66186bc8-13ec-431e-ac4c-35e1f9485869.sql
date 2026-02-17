
-- إضافة عمود fiscal_year_id لجدول العقود (كما في income و expenses)
ALTER TABLE public.contracts
  ADD COLUMN fiscal_year_id uuid REFERENCES public.fiscal_years(id);

-- تثبيت جميع العقود الحالية في سنة 2024-2025
UPDATE public.contracts
  SET fiscal_year_id = (SELECT id FROM public.fiscal_years WHERE label = '1446-1447هـ' LIMIT 1);
