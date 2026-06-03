-- 1) منع تكرار label
ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_label_unique UNIQUE (label);

-- 2) CHECK start<end على مستوى DB
ALTER TABLE public.fiscal_years
  ADD CONSTRAINT fiscal_years_dates_valid CHECK (start_date < end_date);

-- 3) سنة active واحدة فقط (الـtrigger trg_single_active_fy موجود — هذا الفهرس يضمن ذرّية)
CREATE UNIQUE INDEX IF NOT EXISTS fiscal_years_one_active_idx
  ON public.fiscal_years (status) WHERE status = 'active';

-- 4) REPLICA IDENTITY FULL ليصل حدث DELETE كاملاً في Realtime
ALTER TABLE public.fiscal_years REPLICA IDENTITY FULL;

-- 5) تحسين trigger التداخل ليكشف اسم السنة المتعارضة وفترتها في الرسالة
CREATE OR REPLACE FUNCTION public.prevent_fiscal_year_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict RECORD;
BEGIN
  SELECT label, start_date, end_date INTO v_conflict
  FROM public.fiscal_years
  WHERE id <> NEW.id
    AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'يوجد تداخل زمني مع السنة "%" (% → %)',
      v_conflict.label, v_conflict.start_date, v_conflict.end_date
      USING ERRCODE = '23P01';
  END IF;
  RETURN NEW;
END;
$$;