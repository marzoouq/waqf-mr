
-- ============================================================
-- #63: تسلسل رقمي لأرقام تذاكر الدعم
-- ============================================================
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START 1;

ALTER TABLE public.support_tickets
  ALTER COLUMN ticket_number SET DEFAULT
    'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0');

-- ============================================================
-- #64-66: Validation trigger لحالة/أولوية/تصنيف التذاكر
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_support_ticket()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('open', 'in_progress', 'resolved', 'closed', 'cancelled') THEN
    RAISE EXCEPTION 'حالة التذكرة غير صالحة: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('low', 'medium', 'high', 'critical') THEN
    RAISE EXCEPTION 'أولوية التذكرة غير صالحة: %', NEW.priority;
  END IF;
  IF NEW.category NOT IN ('general', 'technical', 'financial', 'billing') THEN
    RAISE EXCEPTION 'تصنيف التذكرة غير صالح: %', NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_support_ticket ON public.support_tickets;
CREATE TRIGGER trg_validate_support_ticket
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket();

-- ============================================================
-- #67: حد طول محتوى ردود التذاكر
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_reply_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF length(NEW.content) > 10000 THEN
    RAISE EXCEPTION 'محتوى الرد يتجاوز الحد المسموح (10000 حرف)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reply_content ON public.support_ticket_replies;
CREATE TRIGGER trg_validate_reply_content
  BEFORE INSERT OR UPDATE ON public.support_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.validate_reply_content();

-- ============================================================
-- #3: إصلاح تكرار تواريخ الاستحقاق في generate_contract_invoices
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

  -- حذف الفواتير المعلقة فقط إذا لم يُدفع منها شيء
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

    -- تخطي الدفعات المكررة التي تقع في نفس التاريخ (#3)
    IF v_due_date = v_prev_due_date THEN
      CONTINUE;
    END IF;
    v_prev_due_date := v_due_date;

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

-- صلاحيات
REVOKE EXECUTE ON FUNCTION public.validate_support_ticket() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.validate_reply_content() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) TO authenticated;
