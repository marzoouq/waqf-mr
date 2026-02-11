
ALTER TABLE public.accounts ADD COLUMN vat_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN distributions_amount numeric NOT NULL DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN waqf_capital numeric NOT NULL DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN net_after_expenses numeric NOT NULL DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN net_after_vat numeric NOT NULL DEFAULT 0;
