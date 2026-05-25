
-- ============================================================
-- إصلاح مزامنة الضريبة مع إعفاء العقار
-- ============================================================

-- 1) إعادة تعريف generate_contract_invoices لتحديث الفواتير الآمنة بدل تخطّيها
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
  v_prev_due_date DATE := NULL;
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
  v_updated INTEGER;
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

  -- حذف الفواتير المعلقة فقط إذا لم يُدفع منها شيء ولم تدخل ZATCA
  DELETE FROM payment_invoices
  WHERE contract_id = p_contract_id
    AND status IN ('pending', 'overdue')
    AND zatca_status IS NOT DISTINCT FROM 'not_submitted'
    AND icv IS NULL
    AND zatca_xml IS NULL
    AND invoice_hash IS NULL
    AND (paid_amount IS NULL OR paid_amount = 0);

  FOR i IN 1..v_payment_count LOOP
    IF v_interval_months IS NOT NULL THEN
      v_due_date := v_start + (i * (v_interval_months || ' months')::interval)::interval;
      IF v_due_date > v_end THEN v_due_date := v_end; END IF;
    ELSE
      v_due_date := v_start + ((v_end - v_start) * i / v_payment_count);
    END IF;

    IF v_due_date = v_prev_due_date THEN
      CONTINUE;
    END IF;
    v_prev_due_date := v_due_date;

    -- تخطي الفواتير المدفوعة
    IF EXISTS (
      SELECT 1 FROM payment_invoices
      WHERE contract_id = p_contract_id AND payment_number = i AND status = 'paid'
    ) THEN
      CONTINUE;
    END IF;

    SELECT fy.id INTO v_fy
    FROM fiscal_years fy
    WHERE v_due_date BETWEEN fy.start_date AND fy.end_date
    LIMIT 1;

    v_vat_amount := ROUND(v_payment_amount * v_effective_vat_rate / 100, 2);

    -- محاولة تحديث فاتورة موجودة آمنة (غير مرسلة، غير مدفوعة، بدون أثر ZATCA)
    UPDATE payment_invoices
    SET
      vat_rate = v_effective_vat_rate,
      vat_amount = v_vat_amount,
      amount = v_payment_amount,
      due_date = v_due_date,
      fiscal_year_id = COALESCE(v_fy.id, v_fallback_fy_id),
      status = CASE WHEN v_due_date < CURRENT_DATE THEN 'overdue' ELSE 'pending' END,
      updated_at = now()
    WHERE contract_id = p_contract_id
      AND payment_number = i
      AND status IN ('pending', 'overdue')
      AND (paid_amount IS NULL OR paid_amount = 0)
      AND zatca_status IS NOT DISTINCT FROM 'not_submitted'
      AND icv IS NULL
      AND invoice_hash IS NULL
      AND zatca_xml IS NULL;

    GET DIAGNOSTICS v_updated = ROW_COUNT;
    IF v_updated > 0 THEN
      v_count := v_count + 1;
      CONTINUE;
    END IF;

    -- إذا الفاتورة موجودة لكنها محمية (ZATCA/مدفوعة جزئياً) — تخطّيها
    IF EXISTS (
      SELECT 1 FROM payment_invoices
      WHERE contract_id = p_contract_id AND payment_number = i
    ) THEN
      CONTINUE;
    END IF;

    -- إدراج فاتورة جديدة
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

REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) TO authenticated;

-- 2) دالة مزامنة ضريبة فواتير العقار
CREATE OR REPLACE FUNCTION public.sync_property_contract_invoice_vat(p_property_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_vat_exempt BOOLEAN;
  v_effective_vat_rate NUMERIC;
  v_updated INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بمزامنة الضريبة';
  END IF;

  SELECT COALESCE(vat_exempt, false) INTO v_property_vat_exempt
  FROM properties WHERE id = p_property_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'العقار غير موجود';
  END IF;

  IF v_property_vat_exempt THEN
    v_effective_vat_rate := 0;
  ELSE
    SELECT COALESCE(value, '0')::numeric INTO v_effective_vat_rate
    FROM app_settings WHERE key = 'default_vat_rate';
    IF v_effective_vat_rate IS NULL THEN v_effective_vat_rate := 0; END IF;
  END IF;

  -- تحديث الفواتير الآمنة فقط
  WITH updated AS (
    UPDATE payment_invoices pi
    SET
      vat_rate = v_effective_vat_rate,
      vat_amount = ROUND(pi.amount * v_effective_vat_rate / 100, 2),
      updated_at = now()
    FROM contracts c
    WHERE pi.contract_id = c.id
      AND c.property_id = p_property_id
      AND pi.status IN ('pending', 'overdue')
      AND (pi.paid_amount IS NULL OR pi.paid_amount = 0)
      AND pi.zatca_status IS NOT DISTINCT FROM 'not_submitted'
      AND pi.icv IS NULL
      AND pi.invoice_hash IS NULL
      AND pi.zatca_xml IS NULL
      AND (pi.vat_rate IS DISTINCT FROM v_effective_vat_rate
           OR pi.vat_amount IS DISTINCT FROM ROUND(pi.amount * v_effective_vat_rate / 100, 2))
    RETURNING pi.id
  )
  SELECT COUNT(*) INTO v_updated FROM updated;

  -- عدّ المتخطّاة (محميّة)
  SELECT COUNT(*) INTO v_skipped
  FROM payment_invoices pi
  JOIN contracts c ON c.id = pi.contract_id
  WHERE c.property_id = p_property_id
    AND (pi.vat_rate IS DISTINCT FROM v_effective_vat_rate)
    AND (
      pi.status NOT IN ('pending', 'overdue')
      OR (pi.paid_amount IS NOT NULL AND pi.paid_amount > 0)
      OR pi.zatca_status IS DISTINCT FROM 'not_submitted'
      OR pi.icv IS NOT NULL
      OR pi.invoice_hash IS NOT NULL
      OR pi.zatca_xml IS NOT NULL
    );

  RETURN jsonb_build_object(
    'updated', v_updated,
    'skipped', v_skipped,
    'effective_vat_rate', v_effective_vat_rate
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.sync_property_contract_invoice_vat(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_property_contract_invoice_vat(uuid) TO authenticated;

-- 3) مشغّل تلقائي عند تغيير vat_exempt على العقار
CREATE OR REPLACE FUNCTION public.trg_sync_property_vat_on_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_vat_rate NUMERIC;
BEGIN
  IF NEW.vat_exempt IS DISTINCT FROM OLD.vat_exempt THEN
    IF NEW.vat_exempt THEN
      v_effective_vat_rate := 0;
    ELSE
      SELECT COALESCE(value, '0')::numeric INTO v_effective_vat_rate
      FROM app_settings WHERE key = 'default_vat_rate';
      IF v_effective_vat_rate IS NULL THEN v_effective_vat_rate := 0; END IF;
    END IF;

    UPDATE payment_invoices pi
    SET
      vat_rate = v_effective_vat_rate,
      vat_amount = ROUND(pi.amount * v_effective_vat_rate / 100, 2),
      updated_at = now()
    FROM contracts c
    WHERE pi.contract_id = c.id
      AND c.property_id = NEW.id
      AND pi.status IN ('pending', 'overdue')
      AND (pi.paid_amount IS NULL OR pi.paid_amount = 0)
      AND pi.zatca_status IS NOT DISTINCT FROM 'not_submitted'
      AND pi.icv IS NULL
      AND pi.invoice_hash IS NULL
      AND pi.zatca_xml IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_vat_sync ON public.properties;
CREATE TRIGGER trg_properties_vat_sync
  AFTER UPDATE OF vat_exempt ON public.properties
  FOR EACH ROW
  WHEN (OLD.vat_exempt IS DISTINCT FROM NEW.vat_exempt)
  EXECUTE FUNCTION public.trg_sync_property_vat_on_change();

-- 4) تصحيح بيانات دفاعي لمرة واحدة — فواتير العقارات المعفاة الآمنة
UPDATE payment_invoices pi
SET
  vat_rate = 0,
  vat_amount = 0,
  updated_at = now()
FROM contracts c
JOIN properties p ON p.id = c.property_id
WHERE pi.contract_id = c.id
  AND p.vat_exempt = true
  AND (COALESCE(pi.vat_rate, 0) <> 0 OR COALESCE(pi.vat_amount, 0) <> 0)
  AND pi.status IN ('pending', 'overdue')
  AND (pi.paid_amount IS NULL OR pi.paid_amount = 0)
  AND pi.zatca_status IS NOT DISTINCT FROM 'not_submitted'
  AND pi.icv IS NULL
  AND pi.invoice_hash IS NULL
  AND pi.zatca_xml IS NULL;
