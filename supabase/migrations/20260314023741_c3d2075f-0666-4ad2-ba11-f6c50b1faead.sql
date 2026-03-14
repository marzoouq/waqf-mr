
-- ========================================
-- Round 2 Audit Fixes
-- ========================================

-- 1. HIGH-07: Add p_payment_date parameter to upsert_tenant_payment
--    Fixes hardcoded CURRENT_DATE for back-dated income entries
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
AS $function$
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
        p_payment_date,
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
$function$;

-- 2. MED-09: Add pending distributions/advances warning to close_fiscal_year
--    Returns warning info but does NOT block closure (design decision)
CREATE OR REPLACE FUNCTION public.close_fiscal_year(p_fiscal_year_id uuid, p_account_data jsonb, p_waqf_corpus_manual numeric)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_fy RECORD;
  v_next_start date;
  v_next_end date;
  v_next_label text;
  v_next_fy_id uuid;
  v_account_id uuid;
  v_existing_next_id uuid;
  v_pending_distributions int;
  v_pending_advances int;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  -- Validate caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'فقط الناظر يمكنه إقفال السنة المالية';
  END IF;

  -- Lock and fetch the fiscal year
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id FOR UPDATE;
  IF v_fy IS NULL THEN
    RAISE EXCEPTION 'السنة المالية غير موجودة';
  END IF;
  IF v_fy.status = 'closed' THEN
    RAISE EXCEPTION 'السنة المالية مقفلة بالفعل';
  END IF;

  -- NEW: Check for pending distributions
  SELECT count(*) INTO v_pending_distributions
  FROM distributions
  WHERE fiscal_year_id = p_fiscal_year_id AND status = 'pending';

  IF v_pending_distributions > 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'pending_distributions',
      'count', v_pending_distributions,
      'message', 'يوجد ' || v_pending_distributions || ' توزيع معلق لم يُدفع بعد'
    );
  END IF;

  -- NEW: Check for pending advance requests
  SELECT count(*) INTO v_pending_advances
  FROM advance_requests
  WHERE fiscal_year_id = p_fiscal_year_id AND status IN ('pending', 'approved');

  IF v_pending_advances > 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'type', 'pending_advances',
      'count', v_pending_advances,
      'message', 'يوجد ' || v_pending_advances || ' طلب سلفة معلق أو مُعتمد لم يُصرف'
    );
  END IF;

  -- Step 1: Upsert the final account for this fiscal year
  SELECT id INTO v_account_id FROM accounts WHERE fiscal_year_id = p_fiscal_year_id;
  IF v_account_id IS NOT NULL THEN
    UPDATE accounts SET
      fiscal_year = COALESCE((p_account_data->>'fiscal_year')::text, v_fy.label),
      total_income = COALESCE((p_account_data->>'total_income')::numeric, 0),
      total_expenses = COALESCE((p_account_data->>'total_expenses')::numeric, 0),
      admin_share = COALESCE((p_account_data->>'admin_share')::numeric, 0),
      waqif_share = COALESCE((p_account_data->>'waqif_share')::numeric, 0),
      waqf_revenue = COALESCE((p_account_data->>'waqf_revenue')::numeric, 0),
      vat_amount = COALESCE((p_account_data->>'vat_amount')::numeric, 0),
      distributions_amount = COALESCE((p_account_data->>'distributions_amount')::numeric, 0),
      net_after_expenses = COALESCE((p_account_data->>'net_after_expenses')::numeric, 0),
      net_after_vat = COALESCE((p_account_data->>'net_after_vat')::numeric, 0),
      zakat_amount = COALESCE((p_account_data->>'zakat_amount')::numeric, 0),
      waqf_corpus_manual = p_waqf_corpus_manual,
      waqf_corpus_previous = COALESCE((p_account_data->>'waqf_corpus_previous')::numeric, 0),
      updated_at = now()
    WHERE id = v_account_id;
  ELSE
    INSERT INTO accounts (
      fiscal_year, fiscal_year_id, total_income, total_expenses,
      admin_share, waqif_share, waqf_revenue, vat_amount,
      distributions_amount, net_after_expenses,
      net_after_vat, zakat_amount, waqf_corpus_manual, waqf_corpus_previous
    ) VALUES (
      COALESCE((p_account_data->>'fiscal_year')::text, v_fy.label),
      p_fiscal_year_id,
      COALESCE((p_account_data->>'total_income')::numeric, 0),
      COALESCE((p_account_data->>'total_expenses')::numeric, 0),
      COALESCE((p_account_data->>'admin_share')::numeric, 0),
      COALESCE((p_account_data->>'waqif_share')::numeric, 0),
      COALESCE((p_account_data->>'waqf_revenue')::numeric, 0),
      COALESCE((p_account_data->>'vat_amount')::numeric, 0),
      COALESCE((p_account_data->>'distributions_amount')::numeric, 0),
      COALESCE((p_account_data->>'net_after_expenses')::numeric, 0),
      COALESCE((p_account_data->>'net_after_vat')::numeric, 0),
      COALESCE((p_account_data->>'zakat_amount')::numeric, 0),
      p_waqf_corpus_manual,
      COALESCE((p_account_data->>'waqf_corpus_previous')::numeric, 0)
    );
  END IF;

  -- Step 2: Close the fiscal year
  UPDATE fiscal_years SET status = 'closed' WHERE id = p_fiscal_year_id;

  -- Step 3: Create next fiscal year
  v_next_start := v_fy.end_date + interval '1 day';
  v_next_end := v_next_start + interval '1 year' - interval '1 day';
  v_next_label := EXTRACT(YEAR FROM v_next_start)::text || '-' || EXTRACT(YEAR FROM v_next_end)::text;

  SELECT id INTO v_existing_next_id FROM fiscal_years
  WHERE start_date = v_next_start LIMIT 1;

  IF v_existing_next_id IS NOT NULL THEN
    v_next_fy_id := v_existing_next_id;
  ELSE
    INSERT INTO fiscal_years (label, start_date, end_date, status, published)
    VALUES (v_next_label, v_next_start, v_next_end, 'active', false)
    RETURNING id INTO v_next_fy_id;
  END IF;

  -- Step 4: Seed account for next year
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE fiscal_year_id = v_next_fy_id) THEN
    INSERT INTO accounts (
      fiscal_year, fiscal_year_id, waqf_corpus_previous,
      total_income, total_expenses, admin_share, waqif_share,
      waqf_revenue, vat_amount, distributions_amount,
      net_after_expenses, net_after_vat, zakat_amount, waqf_corpus_manual
    ) VALUES (
      v_next_label, v_next_fy_id, p_waqf_corpus_manual,
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    );
  ELSE
    UPDATE accounts SET waqf_corpus_previous = p_waqf_corpus_manual
    WHERE fiscal_year_id = v_next_fy_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, user_id)
  VALUES (
    'fiscal_years', 'CLOSE', p_fiscal_year_id,
    jsonb_build_object('status', 'active'),
    jsonb_build_object('status', 'closed', 'next_fy_id', v_next_fy_id, 'warnings', v_warnings),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'closed_label', v_fy.label,
    'next_fy_id', v_next_fy_id,
    'next_label', v_next_label,
    'warnings', v_warnings
  );
END;
$function$;
