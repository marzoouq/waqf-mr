
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_id_type text DEFAULT 'NAT';
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_id_number text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_street text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_building text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_district text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_city text;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS tenant_postal_code text;
