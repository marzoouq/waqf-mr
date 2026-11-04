CREATE OR REPLACE FUNCTION public.generate_contract_invoices(p_contract_id uuid)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD; v_payment_count INTEGER; v_payment_amount NUMERIC; v_due_date DATE;
  v_prev_due_date DATE := NULL; v_invoice_number TEXT; v_count INTEGER := 0; v_start DATE; v_end DATE;
  v_fy RECORD; v_interval_months INTEGER; v_effective_vat_rate NUMERIC; v_vat_amount NUMERIC;
  v_property_vat_exempt BOOLEAN; v_fallback_fy_id UUID; v_updated INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتوليد الفواتير';
  END IF;
  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'العقد غير موجود'; END IF;
  v_fallback_fy_id := v_contract.fiscal_year_id;
  SELECT COALESCE(vat_exempt, false) INTO v_property_vat_exempt FROM properties WHERE id = v_contract.property_id;
  IF v_property_vat_exempt THEN v_effective_vat_rate := 0;
  ELSE
    SELECT COALESCE(value, '0')::numeric INTO v_effective_vat_rate FROM app_settings WHERE key = 'default_vat_rate';
    IF v_effective_vat_rate IS NULL THEN v_effective_vat_rate := 0; END IF;
  END IF;
  IF v_contract.payment_type = 'monthly' THEN v_payment_count := 12; v_interval_months := 1;
  ELSIF v_contract.payment_type = 'quarterly' THEN v_payment_count := 4; v_interval_months := 3;
  ELSIF v_contract.payment_type IN ('semi_annual','semi-annual') THEN v_payment_count := 2; v_interval_months := 6;
  ELSIF v_contract.payment_type = 'annual' THEN v_payment_count := 1; v_interval_months := 12;
  ELSE v_payment_count := COALESCE(v_contract.payment_count, 1); v_interval_months := NULL;
  END IF;
  v_payment_amount := COALESCE(v_contract.payment_amount, v_contract.rent_amount / v_payment_count);
  v_start := v_contract.start_date; v_end := v_contract.end_date;

  DELETE FROM payment_invoices
  WHERE contract_id = p_contract_id AND status IN ('pending', 'overdue')
    AND zatca_status IS NOT DISTINCT FROM 'not_submitted' AND icv IS NULL AND zatca_xml IS NULL
    AND invoice_hash IS NULL AND (paid_amount IS NULL OR paid_amount = 0);

  FOR i IN 1..v_payment_count LOOP
    -- الاستحقاق يبدأ من تاريخ العقد: الدفعة i تستحق بعد (i-1) فترات
    IF v_interval_months IS NOT NULL THEN
      v_due_date := (v_start + ((i - 1) * v_interval_months || ' months')::interval)::date;
      IF v_due_date > v_end THEN v_due_date := v_end; END IF;
    ELSE
      v_due_date := v_start + ((v_end - v_start) * (i - 1) / v_payment_count);
    END IF;
    IF v_due_date = v_prev_due_date THEN CONTINUE; END IF;
    v_prev_due_date := v_due_date;

    IF EXISTS (SELECT 1 FROM payment_invoices WHERE contract_id = p_contract_id AND payment_number = i AND status = 'paid') THEN
      CONTINUE;
    END IF;

    SELECT fy.id INTO v_fy FROM fiscal_years fy WHERE v_due_date BETWEEN fy.start_date AND fy.end_date LIMIT 1;
    v_vat_amount := ROUND(v_payment_amount * v_effective_vat_rate / 100, 2);

    UPDATE payment_invoices SET vat_rate = v_effective_vat_rate, vat_amount = v_vat_amount, amount = v_payment_amount,
      due_date = v_due_date, fiscal_year_id = COALESCE(v_fy.id, v_fallback_fy_id),
      status = CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END, updated_at = now()
    WHERE contract_id = p_contract_id AND payment_number = i AND status IN ('pending', 'overdue')
      AND (paid_amount IS NULL OR paid_amount = 0) AND zatca_status IS NOT DISTINCT FROM 'not_submitted'
      AND icv IS NULL AND invoice_hash IS NULL AND zatca_xml IS NULL;
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN v_count := v_count + 1; CONTINUE; END IF;

    IF EXISTS (SELECT 1 FROM payment_invoices WHERE contract_id = p_contract_id AND payment_number = i) THEN
      CONTINUE;
    END IF;

    v_invoice_number := v_contract.contract_number || '-P' || LPAD(i::text, 2, '0');
    INSERT INTO payment_invoices (contract_id, payment_number, invoice_number, amount, vat_rate, vat_amount, due_date, status, fiscal_year_id)
    VALUES (p_contract_id, i, v_invoice_number, v_payment_amount, v_effective_vat_rate, v_vat_amount, v_due_date,
      CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END, COALESCE(v_fy.id, v_fallback_fy_id));
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$function$;