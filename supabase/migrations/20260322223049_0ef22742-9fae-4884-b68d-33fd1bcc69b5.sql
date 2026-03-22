-- 1) إضافة distributions للـ Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'distributions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.distributions;
  END IF;
END $$;

-- 2) حذف القيد المكرر unique_contract_number
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_contract_number' AND conrelid = 'public.contracts'::regclass
  ) THEN
    ALTER TABLE public.contracts DROP CONSTRAINT unique_contract_number;
  END IF;
END $$;

-- 3) تشديد fiscal_year_id ليكون NOT NULL في الجداول المالية
ALTER TABLE public.distributions ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.accounts ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.income ALTER COLUMN fiscal_year_id SET NOT NULL;
ALTER TABLE public.expenses ALTER COLUMN fiscal_year_id SET NOT NULL;