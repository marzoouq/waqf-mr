CREATE EXTENSION IF NOT EXISTS btree_gist;

-- إزالة trigger القديم (لا يحمي من سباقات التزامن)
DROP TRIGGER IF EXISTS trg_prevent_fiscal_year_overlap ON public.fiscal_years;
DROP FUNCTION IF EXISTS public.prevent_fiscal_year_overlap();

-- قيد ذرّي على مستوى الفهرس (يضمن منع التداخل حتى مع INSERT متزامن)
ALTER TABLE public.fiscal_years
  DROP CONSTRAINT IF EXISTS fiscal_years_no_overlap;

ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_no_overlap
  EXCLUDE USING gist (daterange(start_date, end_date, '[]') WITH &&);