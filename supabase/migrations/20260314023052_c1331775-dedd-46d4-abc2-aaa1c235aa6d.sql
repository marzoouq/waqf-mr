
CREATE OR REPLACE FUNCTION public.validate_advance_request_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_share_pct numeric;
  v_total_pct numeric;
  v_available_amount numeric;
  v_paid_advances numeric;
  v_max_advance numeric;
  v_estimated_share numeric;
  v_max_percentage numeric;
BEGIN
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = NEW.beneficiary_id;

  IF v_share_pct IS NULL THEN
    RAISE EXCEPTION 'المستفيد غير موجود';
  END IF;

  SELECT COALESCE(SUM(share_percentage), 100) INTO v_total_pct FROM beneficiaries;

  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = NEW.fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = NEW.beneficiary_id
    AND fiscal_year_id = NEW.fiscal_year_id
    AND status = 'paid'
    AND id != NEW.id;

  SELECT COALESCE(value::numeric, 50) INTO v_max_percentage
  FROM app_settings WHERE key = 'advance_max_percentage';
  IF v_max_percentage IS NULL THEN v_max_percentage := 50; END IF;

  v_max_advance := GREATEST(0, (v_estimated_share * v_max_percentage / 100) - v_paid_advances);

  IF NEW.amount > v_max_advance THEN
    RAISE EXCEPTION 'مبلغ السلفة (%) يتجاوز الحد الأقصى المسموح (%) بنسبة %',
      NEW.amount, ROUND(v_max_advance, 2), v_max_percentage || '%%';
  END IF;

  RETURN NEW;
END;
$function$;
