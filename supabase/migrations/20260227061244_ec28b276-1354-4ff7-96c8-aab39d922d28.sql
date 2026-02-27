
-- Atomic upsert_tenant_payment RPC to prevent race conditions
CREATE OR REPLACE FUNCTION public.upsert_tenant_payment(
  p_contract_id uuid,
  p_paid_months int,
  p_notes text DEFAULT NULL,
  p_payment_amount numeric DEFAULT 0,
  p_property_id uuid DEFAULT NULL,
  p_fiscal_year_id uuid DEFAULT NULL,
  p_tenant_name text DEFAULT NULL
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
BEGIN
  -- Only admin/accountant can upsert payments
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل بيانات التحصيل';
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

  -- 3) Auto-create income records if payments increased
  v_diff := p_paid_months - v_old_paid_months;
  IF v_diff > 0 AND p_payment_amount > 0 THEN
    FOR v_i IN 1..v_diff LOOP
      INSERT INTO income (source, amount, date, property_id, contract_id, fiscal_year_id, notes)
      VALUES (
        'إيجار - ' || COALESCE(p_tenant_name, ''),
        p_payment_amount,
        CURRENT_DATE,
        p_property_id,
        p_contract_id,
        p_fiscal_year_id,
        'تحصيل تلقائي - الدفعة رقم ' || (v_old_paid_months + v_i)
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'old_paid_months', v_old_paid_months,
    'new_paid_months', p_paid_months,
    'income_created', GREATEST(v_diff, 0)
  );
END;
$$;
