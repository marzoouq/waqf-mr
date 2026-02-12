
-- Drop existing audit triggers if any
DROP TRIGGER IF EXISTS audit_income ON public.income;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
DROP TRIGGER IF EXISTS audit_accounts ON public.accounts;
DROP TRIGGER IF EXISTS audit_distributions ON public.distributions;

-- Create audit triggers
CREATE TRIGGER audit_income
  AFTER INSERT OR UPDATE OR DELETE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_distributions
  AFTER INSERT OR UPDATE OR DELETE ON public.distributions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Validation trigger for closed fiscal years
CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fy_status text;
  fy_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    fy_id := OLD.fiscal_year_id;
  ELSE
    fy_id := NEW.fiscal_year_id;
  END IF;

  IF fy_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT status INTO fy_status FROM public.fiscal_years WHERE id = fy_id;

  IF fy_status = 'closed' THEN
    RAISE EXCEPTION 'لا يمكن تعديل بيانات سنة مالية مقفلة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

DROP TRIGGER IF EXISTS prevent_closed_fy_income ON public.income;
DROP TRIGGER IF EXISTS prevent_closed_fy_expenses ON public.expenses;

CREATE TRIGGER prevent_closed_fy_income
  BEFORE INSERT OR UPDATE OR DELETE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();

CREATE TRIGGER prevent_closed_fy_expenses
  BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();
