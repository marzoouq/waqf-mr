CREATE OR REPLACE FUNCTION public.validate_advance_carryforward_amount()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.amount IS NULL OR NEW.amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ الترحيل يجب أن يكون أكبر من صفر';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_advance_carryforward_amount ON public.advance_carryforward;
CREATE TRIGGER trg_validate_advance_carryforward_amount BEFORE INSERT OR UPDATE OF amount ON public.advance_carryforward
FOR EACH ROW EXECUTE FUNCTION public.validate_advance_carryforward_amount();

CREATE OR REPLACE FUNCTION public.guard_distribution_conflict_of_interest()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
     AND EXISTS (SELECT 1 FROM public.beneficiaries WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'لا يجوز لمستخدم مرتبط بسجل مستفيد تنفيذ التوزيع';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_guard_distribution_conflict ON public.distributions;
CREATE TRIGGER trg_guard_distribution_conflict BEFORE INSERT ON public.distributions
FOR EACH ROW EXECUTE FUNCTION public.guard_distribution_conflict_of_interest();

CREATE OR REPLACE FUNCTION public.validate_voucher_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_exp numeric;
BEGIN
  SELECT amount INTO v_exp FROM public.expenses WHERE id = NEW.expense_id;
  IF v_exp IS NULL THEN RAISE EXCEPTION 'EXPENSE_NOT_FOUND'; END IF;
  IF NEW.amount <= 0 OR NEW.amount > v_exp THEN
    RAISE EXCEPTION 'VOUCHER_AMOUNT_EXCEEDS_EXPENSE';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_validate_voucher_amount ON public.disbursement_vouchers;
CREATE TRIGGER trg_validate_voucher_amount BEFORE INSERT OR UPDATE OF amount, expense_id ON public.disbursement_vouchers
FOR EACH ROW EXECUTE FUNCTION public.validate_voucher_amount();

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO service_role;