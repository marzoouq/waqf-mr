
ALTER TABLE public.contracts
  ADD COLUMN payment_type text NOT NULL DEFAULT 'annual',
  ADD COLUMN payment_count integer NOT NULL DEFAULT 1,
  ADD COLUMN payment_amount numeric;
