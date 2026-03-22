CREATE OR REPLACE FUNCTION public.set_distribution_fiscal_year()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fiscal_year_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT fiscal_year_id INTO NEW.fiscal_year_id
    FROM public.accounts WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;