CREATE OR REPLACE FUNCTION public.close_fiscal_year(
  p_fiscal_year_id uuid,
  p_account_data jsonb,
  p_waqf_corpus_manual numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy RECORD; v_account_id uuid;
  v_next_start date; v_next_end date; v_next_label text;
  v_existing_next_id uuid;
  v_warnings text[] := '{}';
  v_pending_distributions int; v_pending_advances int;
  v_carried_invoices int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بإقفال السنة المالية';
  END IF;

  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id FOR UPDATE;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'السنة المالية غير موجودة'; END IF;
  IF v_fy.status = 'closed' THEN RAISE EXCEPTION 'السنة المالية مقفلة بالفعل'; END IF;

  SELECT count(*) INTO v_pending_distributions
  FROM distributions WHERE fiscal_year_id = p_fiscal_year_id AND status = 'pending';
  IF v_pending_distributions > 0 THEN
    v_warnings := array_append(v_warnings, 'يوجد ' || v_pending_distributions || ' توزيع بحالة معلقة');
  END IF;

  SELECT count(*) INTO v_pending_advances
  FROM advance_requests WHERE fiscal_year_id = p_fiscal_year_id AND status IN ('pending', 'approved');
  IF v_pending_advances > 0 THEN
    v_warnings := array_append(v_warnings, 'يوجد ' || v_pending_advances || ' طلب سلفة بحالة معلقة أو موافق عليها');
  END IF;

  SELECT id INTO v_account_id FROM accounts WHERE fiscal_year_id = p_fiscal_year_id;

  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      fiscal_year, fiscal_year_id, total_income, total_expenses, vat_amount, zakat_amount,
      admin_share, waqif_share, net_after_expenses, net_after_vat,
      waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount
    ) VALUES (
      v_fy.label, p_fiscal_year_id,
      COALESCE((p_account_data->>'total_income')::numeric, 0),
      COALESCE((p_account_data->>'total_expenses')::numeric, 0),
      COALESCE((p_account_data->>'vat_amount')::numeric, 0),
      COALESCE((p_account_data->>'zakat_amount')::numeric, 0),
      COALESCE((p_account_data->>'admin_share')::numeric, 0),
      COALESCE((p_account_data->>'waqif_share')::numeric, 0),
      COALESCE((p_account_data->>'net_after_expenses')::numeric, 0),
      COALESCE((p_account_data->>'net_after_vat')::numeric, 0),
      COALESCE((p_account_data->>'waqf_revenue')::numeric, 0),
      p_waqf_corpus_manual,
      COALESCE((p_account_data->>'waqf_corpus_previous')::numeric, 0),
      COALESCE((p_account_data->>'distributions_amount')::numeric, 0)
    ) RETURNING id INTO v_account_id;
  ELSE
    UPDATE accounts SET
      total_income = COALESCE((p_account_data->>'total_income')::numeric, 0),
      total_expenses = COALESCE((p_account_data->>'total_expenses')::numeric, 0),
      vat_amount = COALESCE((p_account_data->>'vat_amount')::numeric, 0),
      zakat_amount = COALESCE((p_account_data->>'zakat_amount')::numeric, 0),
      admin_share = COALESCE((p_account_data->>'admin_share')::numeric, 0),
      waqif_share = COALESCE((p_account_data->>'waqif_share')::numeric, 0),
      net_after_expenses = COALESCE((p_account_data->>'net_after_expenses')::numeric, 0),
      net_after_vat = COALESCE((p_account_data->>'net_after_vat')::numeric, 0),
      waqf_revenue = COALESCE((p_account_data->>'waqf_revenue')::numeric, 0),
      waqf_corpus_manual = p_waqf_corpus_manual,
      waqf_corpus_previous = COALESCE((p_account_data->>'waqf_corpus_previous')::numeric, 0),
      distributions_amount = COALESCE((p_account_data->>'distributions_amount')::numeric, 0),
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  UPDATE fiscal_years SET status = 'closed' WHERE id = p_fiscal_year_id;

  -- إنشاء سنة مالية تالية تلقائياً
  v_next_start := v_fy.end_date + interval '1 day';
  v_next_end := v_next_start + interval '1 year' - interval '1 day';
  v_next_label := extract(year from v_next_start)::text || '/' || extract(year from v_next_end)::text;

  SELECT id INTO v_existing_next_id FROM fiscal_years
  WHERE start_date = v_next_start;

  IF v_existing_next_id IS NULL THEN
    INSERT INTO fiscal_years (label, start_date, end_date, status, published)
    VALUES (v_next_label, v_next_start, v_next_end, 'active', false)
    RETURNING id INTO v_existing_next_id;
  END IF;

  -- ترحيل الفواتير غير المسددة للسنة التالية
  -- فقط الفواتير التي لم تُوقّع/تُرسل لـ ZATCA
  IF v_existing_next_id IS NOT NULL THEN
    UPDATE payment_invoices
    SET fiscal_year_id = v_existing_next_id,
        updated_at = now()
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status IN ('pending', 'overdue')
      AND (zatca_status IS NULL OR zatca_status = 'not_submitted');

    GET DIAGNOSTICS v_carried_invoices = ROW_COUNT;
    IF v_carried_invoices > 0 THEN
      v_warnings := array_append(v_warnings, 'تم ترحيل ' || v_carried_invoices || ' فاتورة غير مسددة للسنة التالية');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'carried_invoices', COALESCE(v_carried_invoices, 0),
    'warnings', to_jsonb(v_warnings)
  );
END;
$$;