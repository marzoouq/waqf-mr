
-- C-08 fix: Remove redundant waqf_capital column (always duplicates waqf_corpus_manual)

-- Step 1: Drop the column
ALTER TABLE public.accounts DROP COLUMN waqf_capital;

-- Step 2: Update close_fiscal_year RPC to remove waqf_capital references
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

  -- Step 3: Create next fiscal year (start = end_date + 1 day)
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

  -- Step 4: Seed account for next year with carried-over corpus
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
    jsonb_build_object('status', 'closed', 'next_fy_id', v_next_fy_id),
    auth.uid()
  );

  RETURN jsonb_build_object(
    'success', true,
    'closed_label', v_fy.label,
    'next_fy_id', v_next_fy_id,
    'next_label', v_next_label
  );
END;
$function$;
