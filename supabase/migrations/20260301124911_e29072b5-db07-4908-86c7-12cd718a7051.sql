
-- D8: إضافة trigger للتحقق من أن مبلغ طلب السلفة لا يتجاوز 50% من الحصة التقديرية
-- الحساب: الحصة التقديرية = (availableAmount من آخر حساب ختامي) * (share_percentage / 100)
-- الحد الأقصى = 50% من الحصة التقديرية - السُلف المصروفة سابقاً

CREATE OR REPLACE FUNCTION public.validate_advance_request_amount()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_share_pct numeric;
  v_available_amount numeric;
  v_paid_advances numeric;
  v_max_advance numeric;
  v_estimated_share numeric;
BEGIN
  -- جلب نسبة حصة المستفيد
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = NEW.beneficiary_id;

  IF v_share_pct IS NULL THEN
    RAISE EXCEPTION 'المستفيد غير موجود';
  END IF;

  -- جلب المبلغ المتاح من آخر حساب ختامي (waqf_revenue - waqf_corpus_manual)
  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = NEW.fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- إذا لا يوجد حساب ختامي بعد، استخدم صفر → الحد الأقصى = 0
  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  v_estimated_share := v_available_amount * v_share_pct / 100;

  -- حساب السُلف المصروفة سابقاً في نفس السنة
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = NEW.beneficiary_id
    AND fiscal_year_id = NEW.fiscal_year_id
    AND status = 'paid'
    AND id != NEW.id;

  v_max_advance := GREATEST(0, (v_estimated_share * 0.5) - v_paid_advances);

  IF NEW.amount > v_max_advance THEN
    RAISE EXCEPTION 'مبلغ السلفة (%) يتجاوز الحد الأقصى المسموح (%) — 50%% من الحصة التقديرية', 
      NEW.amount, ROUND(v_max_advance, 2);
  END IF;

  RETURN NEW;
END;
$function$;

-- تطبيق الـ trigger على INSERT فقط (الطلبات الجديدة)
DROP TRIGGER IF EXISTS validate_advance_request_amount_trigger ON public.advance_requests;
CREATE TRIGGER validate_advance_request_amount_trigger
  BEFORE INSERT ON public.advance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_advance_request_amount();
