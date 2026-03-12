ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_tax_number text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_crn text;