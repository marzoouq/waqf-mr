
-- ============================================================
-- #4  تقريب عدد المستفيدين في get_public_stats
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN json_build_object(
    'properties', (SELECT count(*) FROM public.properties),
    'beneficiaries', (SELECT floor(count(*)::numeric / 10) * 10 FROM public.beneficiaries),
    'fiscal_years', (SELECT count(*) FROM public.fiscal_years)
  );
END;
$$;

-- ============================================================
-- #73  منع تداخل السنوات المالية
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_fiscal_year_overlap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fiscal_years
    WHERE id != NEW.id
    AND daterange(start_date, end_date, '[]') && daterange(NEW.start_date, NEW.end_date, '[]')
  ) THEN
    RAISE EXCEPTION 'تداخل في تواريخ السنوات المالية — لا يمكن إنشاء سنة مالية تتداخل مع سنة موجودة';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_fiscal_year_overlap ON public.fiscal_years;
CREATE TRIGGER trg_prevent_fiscal_year_overlap
  BEFORE INSERT OR UPDATE ON public.fiscal_years
  FOR EACH ROW EXECUTE FUNCTION public.prevent_fiscal_year_overlap();

-- ============================================================
-- #61  منع المراجع الدائرية في account_categories
-- ============================================================
CREATE OR REPLACE FUNCTION public.prevent_category_circular_ref()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_id uuid := NEW.parent_id;
  v_depth integer := 0;
BEGIN
  IF v_parent_id IS NULL THEN RETURN NEW; END IF;
  WHILE v_parent_id IS NOT NULL LOOP
    IF v_parent_id = NEW.id THEN
      RAISE EXCEPTION 'مرجع دائري في شجرة الفئات المحاسبية';
    END IF;
    v_depth := v_depth + 1;
    IF v_depth > 20 THEN
      RAISE EXCEPTION 'عمق شجرة الفئات المحاسبية تجاوز الحد المسموح (20)';
    END IF;
    SELECT parent_id INTO v_parent_id FROM public.account_categories WHERE id = v_parent_id;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_category_circular_ref ON public.account_categories;
CREATE TRIGGER trg_prevent_category_circular_ref
  BEFORE INSERT OR UPDATE ON public.account_categories
  FOR EACH ROW EXECUTE FUNCTION public.prevent_category_circular_ref();

-- ============================================================
-- #2  إعادة تعريف generate_contract_invoices مع فحص paid_amount
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_contract_invoices(p_contract_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_fallback_fy_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتوليد الفواتير';
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = p_contract_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'العقد غير موجود';
  END IF;

  v_fallback_fy_id := v_contract.fiscal_year_id;

  SELECT COALESCE(vat_exempt, false) INTO v_property_vat_exempt
  FROM properties WHERE id = v_contract.property_id;

  IF v_property_vat_exempt THEN
    v_effective_vat_rate := 0;
  ELSE
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

  -- حذف الفواتير المعلقة فقط إذا لم يُدفع منها شيء (#2 — Cycle 4)
  DELETE FROM payment_invoices
  WHERE contract_id = p_contract_id
    AND status IN ('pending', 'overdue')
    AND zatca_status IS NOT DISTINCT FROM 'not_submitted'
    AND icv IS NULL
    AND zatca_xml IS NULL
    AND (paid_amount IS NULL OR paid_amount = 0);

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

    IF EXISTS (
      SELECT 1 FROM payment_invoices
      WHERE contract_id = p_contract_id AND payment_number = i AND status IN ('pending', 'overdue')
    ) THEN
      CONTINUE;
    END IF;

    SELECT fy.id INTO v_fy
    FROM fiscal_years fy
    WHERE v_due_date BETWEEN fy.start_date AND fy.end_date
    LIMIT 1;

    v_vat_amount := ROUND(v_payment_amount * v_effective_vat_rate / 100, 2);

    v_invoice_number := v_contract.contract_number || '-P' || LPAD(i::text, 2, '0');

    INSERT INTO payment_invoices (
      contract_id, payment_number, invoice_number, amount, vat_rate, vat_amount,
      due_date, status, fiscal_year_id
    ) VALUES (
      p_contract_id, i, v_invoice_number, v_payment_amount, v_effective_vat_rate, v_vat_amount,
      v_due_date, CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
      COALESCE(v_fy.id, v_fallback_fy_id)
    );

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;
