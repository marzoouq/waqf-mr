
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS zakat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS waqf_corpus_manual numeric NOT NULL DEFAULT 0;

INSERT INTO public.app_settings (key, value) VALUES ('vat_percentage', '15') ON CONFLICT (key) DO NOTHING;
INSERT INTO public.app_settings (key, value) VALUES ('residential_vat_exempt', 'true') ON CONFLICT (key) DO NOTHING;
