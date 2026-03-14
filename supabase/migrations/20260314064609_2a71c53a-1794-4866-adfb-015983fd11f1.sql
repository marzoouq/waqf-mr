
-- 1. إضافة حقل vat_exempt على جدول properties
ALTER TABLE properties ADD COLUMN IF NOT EXISTS vat_exempt boolean NOT NULL DEFAULT false;

-- 2. تعديل دالة generate_contract_invoices لتتحقق من نوع العقار
CREATE OR REPLACE FUNCTION public.generate_contract_invoices(p_contract_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_contract RECORD;
  v_payment_count INTEGER;
  v_payment_amount NUMERIC;
  v_due_date DATE;
  v_invoice_number TEXT;
  v_count INTEGER := 0;
  v_start DATE;
  v_end DATE;
  v_fy RECORD;
  v_interval_months INTEGER;
  v_effective_vat_rate NUMERIC;
  v_vat_amount NUMERIC;
  v_property_vat_exempt BOOLEAN;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتوليد الفواتير';
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العقد غير موجود';
  END IF;

  -- التحقق من إعفاء العقار من الضريبة
  SELECT COALESCE(vat_exempt, false) INTO v_property_vat_exempt
  FROM properties WHERE id = v_contract.property_id;

  IF v_property_vat_exempt THEN
    -- العقار معفى (سكني) → نسبة VAT = 0
    v_effective_vat_rate := 0;
  ELSE
    -- العقار غير معفى (تجاري) → نسبة VAT من الإعدادات
    SELECT COALESCE(value, '0')::numeric INTO v_effective_vat_rate
    FROM app_settings WHERE key = 'default_vat_rate';
    IF v_effective_vat_rate IS NULL THEN v_effective_vat_rate := 0; END IF;
  END IF;

  IF v_contract.payment_type = 'monthly' THEN
    v_payment_count := 12; v_interval_months := 1;
  ELSIF v_contract.payment_type = 'quarterly' THEN
    v_payment_count := 4; v_interval_months := 3;
  ELSIF v_contract.payment_type = 'semi_annual' OR v_contract.payment_type = 'semi-annual' THEN
    v_payment_count := 2; v_interval_months := 6;
  ELSIF v_contract.payment_type = 'annual' THEN
    v_payment_count := 1; v_interval_months := 12;
  ELSE
    v_payment_count := COALESCE(v_contract.payment_count, 1);
    v_interval_months := NULL;
  END IF;

  v_payment_amount := COALESCE(v_contract.payment_amount, v_contract.rent_amount / v_payment_count);
  v_start := v_contract.start_date;
  v_end := v_contract.end_date;

  -- حذف الفواتير غير المسددة التي لا تحتوي على بيانات ZATCA
  DELETE FROM payment_invoices
  WHERE contract_id = p_contract_id
    AND status IN ('pending', 'overdue')
    AND zatca_status IS NOT DISTINCT FROM 'not_submitted'
    AND icv IS NULL
    AND zatca_xml IS NULL;

  FOR i IN 1..v_payment_count LOOP
    IF v_interval_months IS NOT NULL THEN
      v_due_date := v_start + (i * (v_interval_months || ' months')::interval)::interval;
      IF v_due_date > v_end THEN v_due_date := v_end; END IF;
    ELSE
      v_due_date := v_start + ((v_end - v_start) * i / v_payment_count);
    END IF;

    IF EXISTS (
      SELECT 1 FROM payment_invoices
      WHERE contract_id = p_contract_id AND payment_number = i AND status = 'paid'
    ) THEN
      CONTINUE;
    END IF;

    SELECT id INTO v_fy FROM fiscal_years
    WHERE v_due_date >= start_date AND v_due_date <= end_date
    ORDER BY start_date LIMIT 1;

    v_invoice_number := v_contract.contract_number || '-INV-' || LPAD(i::text, 2, '0');
    v_vat_amount := v_payment_amount * v_effective_vat_rate / 100;

    INSERT INTO payment_invoices (
      contract_id, fiscal_year_id, invoice_number, payment_number,
      due_date, amount, status, vat_rate, vat_amount
    ) VALUES (
      p_contract_id, v_fy.id, v_invoice_number, i,
      v_due_date, v_payment_amount,
      CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
      v_effective_vat_rate, v_vat_amount
    )
    ON CONFLICT (contract_id, payment_number) DO UPDATE
    SET due_date = EXCLUDED.due_date,
        amount = EXCLUDED.amount,
        fiscal_year_id = EXCLUDED.fiscal_year_id,
        invoice_number = EXCLUDED.invoice_number,
        vat_rate = EXCLUDED.vat_rate,
        vat_amount = EXCLUDED.vat_amount,
        status = CASE WHEN payment_invoices.status = 'paid' THEN 'paid' ELSE EXCLUDED.status END;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- 3. تعديل generate_all_active_invoices (تستدعي generate_contract_invoices فلا تحتاج تعديل منطق VAT)
-- لكن نحتاج التأكد من وجودها بالشكل الحالي — لا تعديل مطلوب لأنها تستدعي generate_contract_invoices

-- 4. إعادة منح الصلاحيات
REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) TO authenticated;
