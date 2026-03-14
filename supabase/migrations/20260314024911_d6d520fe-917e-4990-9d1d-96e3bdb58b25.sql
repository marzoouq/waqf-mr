
-- CRIT-09: Restrict tenant_payments SELECT to admin/accountant only
DROP POLICY IF EXISTS "Authorized roles can view tenant_payments" ON public.tenant_payments;
DROP POLICY IF EXISTS "Authenticated users can view tenant_payments" ON public.tenant_payments;

CREATE POLICY "Admin and accountant can view tenant_payments"
  ON public.tenant_payments FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'accountant')
  );

-- HIGH-15 + MED-20: Harden upsert_tenant_payment with bounds check and income reversal
CREATE OR REPLACE FUNCTION public.upsert_tenant_payment(
  p_contract_id uuid,
  p_paid_months integer,
  p_notes text DEFAULT NULL,
  p_payment_amount numeric DEFAULT 0,
  p_property_id uuid DEFAULT NULL,
  p_fiscal_year_id uuid DEFAULT NULL,
  p_tenant_name text DEFAULT NULL,
  p_payment_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_old_paid_months int;
  v_diff int;
  v_i int;
  v_contract_payment_count int;
  v_deleted_income int := 0;
BEGIN
  -- Only admin/accountant can upsert payments
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل بيانات التحصيل';
  END IF;

  -- MED-20: Validate p_paid_months bounds
  IF p_paid_months < 0 THEN
    RAISE EXCEPTION 'عدد الدفعات المسددة لا يمكن أن يكون سالباً';
  END IF;

  SELECT payment_count INTO v_contract_payment_count
  FROM contracts WHERE id = p_contract_id;

  IF v_contract_payment_count IS NULL THEN
    RAISE EXCEPTION 'العقد غير موجود';
  END IF;

  IF p_paid_months > v_contract_payment_count THEN
    RAISE EXCEPTION 'عدد الدفعات المسددة (%) يتجاوز عدد دفعات العقد (%)', p_paid_months, v_contract_payment_count;
  END IF;

  -- 1) Lock existing row (or get NULL)
  SELECT tp.paid_months INTO v_old_paid_months
  FROM tenant_payments tp
  WHERE tp.contract_id = p_contract_id
  FOR UPDATE;

  IF v_old_paid_months IS NULL THEN
    v_old_paid_months := 0;
  END IF;

  -- 2) Upsert tenant_payments
  INSERT INTO tenant_payments (contract_id, paid_months, notes)
  VALUES (p_contract_id, p_paid_months, p_notes)
  ON CONFLICT (contract_id) DO UPDATE
    SET paid_months = EXCLUDED.paid_months,
        notes = EXCLUDED.notes,
        updated_at = now();

  v_diff := p_paid_months - v_old_paid_months;

  -- 3) Auto-create income records if payments increased
  IF v_diff > 0 AND p_payment_amount > 0 THEN
    FOR v_i IN 1..v_diff LOOP
      INSERT INTO income (source, amount, date, property_id, contract_id, fiscal_year_id, notes)
      VALUES (
        'إيجار - ' || COALESCE(p_tenant_name, ''),
        p_payment_amount,
        p_payment_date,
        p_property_id,
        p_contract_id,
        p_fiscal_year_id,
        'تحصيل تلقائي - الدفعة رقم ' || (v_old_paid_months + v_i)
      );
    END LOOP;
  END IF;

  -- HIGH-15: Delete auto-created income records if payments decreased
  IF v_diff < 0 THEN
    WITH to_delete AS (
      SELECT id FROM income
      WHERE contract_id = p_contract_id
        AND notes LIKE 'تحصيل تلقائي%'
      ORDER BY created_at DESC
      LIMIT ABS(v_diff)
    )
    DELETE FROM income WHERE id IN (SELECT id FROM to_delete);
    GET DIAGNOSTICS v_deleted_income = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'old_paid_months', v_old_paid_months,
    'new_paid_months', p_paid_months,
    'income_created', GREATEST(v_diff, 0),
    'income_deleted', v_deleted_income
  );
END;
$$;
