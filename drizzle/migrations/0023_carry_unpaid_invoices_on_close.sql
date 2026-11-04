ALTER TABLE public.payment_invoices ADD COLUMN IF NOT EXISTS origin_fiscal_year_id uuid REFERENCES public.fiscal_years(id);
COMMENT ON COLUMN public.payment_invoices.origin_fiscal_year_id IS 'Fiscal year the invoice was overdue in before carry-forward at closing; null when not carried overdue';
CREATE INDEX IF NOT EXISTS idx_payment_invoices_origin_fy ON public.payment_invoices(origin_fiscal_year_id) WHERE origin_fiscal_year_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.close_fiscal_year(p_fiscal_year_id uuid, p_account_data jsonb, p_waqf_corpus_manual numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fy RECORD; v_account_id uuid;
  v_next_start date; v_next_end date; v_next_label text;
  v_existing_next_id uuid;
  v_warnings text[] := '{}';
  v_pending_distributions int; v_pending_advances int;
  v_carried_invoices int;
  v_total_income numeric;
  v_actual_distributions numeric;
  v_overdue_count int := 0; v_overdue_amount numeric := 0; v_cid uuid;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'فقط الناظر يملك صلاحية إقفال السنة المالية';
  END IF;

  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id FOR UPDATE;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'السنة المالية غير موجودة'; END IF;
  IF v_fy.status = 'closed' THEN RAISE EXCEPTION 'السنة المالية مقفلة بالفعل'; END IF;

  v_total_income := COALESCE((p_account_data->>'total_income')::numeric, 0);
  IF v_total_income <= 0 AND COALESCE((p_account_data->>'total_expenses')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'لا يمكن إقفال السنة المالية بحسابات ختامية صفرية. يجب حفظ الحسابات الختامية أولاً من صفحة الحسابات.';
  END IF;

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

  SELECT COALESCE(SUM(amount), 0) INTO v_actual_distributions
  FROM distributions
  WHERE fiscal_year_id = p_fiscal_year_id
    AND status <> 'cancelled';

  SELECT id INTO v_account_id FROM accounts WHERE fiscal_year_id = p_fiscal_year_id;

  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      fiscal_year, fiscal_year_id, total_income, total_expenses, vat_amount, zakat_amount,
      admin_share, waqif_share, net_after_expenses, net_after_vat,
      waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount
    ) VALUES (
      v_fy.label, p_fiscal_year_id,
      v_total_income,
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
      v_actual_distributions
    ) RETURNING id INTO v_account_id;
  ELSE
    UPDATE accounts SET
      total_income = v_total_income,
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
      distributions_amount = v_actual_distributions,
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  UPDATE fiscal_years SET status = 'closed' WHERE id = p_fiscal_year_id;

  v_next_start := v_fy.end_date + interval '1 day';
  v_next_end := v_next_start + interval '1 year' - interval '1 day';
  v_next_label := extract(year from v_next_start)::text || '-' || extract(year from v_next_end)::text;

  SELECT id INTO v_existing_next_id FROM fiscal_years WHERE start_date = v_next_start;

  IF v_existing_next_id IS NULL THEN
    INSERT INTO fiscal_years (label, start_date, end_date, status, published)
    VALUES (v_next_label, v_next_start, v_next_end, 'active', false)
    RETURNING id INTO v_existing_next_id;
  END IF;

  IF v_existing_next_id IS NOT NULL THEN
    -- ترحيل كل فاتورة غير مسددة للسنة التالية؛ المتأخرة تحفظ سنتها الأصلية.
    -- رقم الفاتورة الضريبية وتاريخها لا يتغيران؛ تتغير السنة المحاسبية فقط.
    SELECT count(*) FILTER (WHERE due_date <= v_fy.end_date),
           COALESCE(SUM(amount) FILTER (WHERE due_date <= v_fy.end_date), 0)
      INTO v_overdue_count, v_overdue_amount
      FROM payment_invoices
     WHERE fiscal_year_id = p_fiscal_year_id AND status IN ('pending','overdue');

    UPDATE payment_invoices
    SET origin_fiscal_year_id = COALESCE(origin_fiscal_year_id, CASE WHEN due_date <= v_fy.end_date THEN p_fiscal_year_id END),
        fiscal_year_id = v_existing_next_id, updated_at = now()
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status IN ('pending', 'overdue');

    GET DIAGNOSTICS v_carried_invoices = ROW_COUNT;

    FOR v_cid IN SELECT DISTINCT contract_id FROM payment_invoices WHERE fiscal_year_id = v_existing_next_id LOOP
      PERFORM public.recompute_contract_allocations(v_cid);
    END LOOP;

    IF v_overdue_count > 0 THEN
      PERFORM public.notify_admins(
        'متأخرات مرحّلة من ' || v_fy.label,
        'رُحِّلت ' || v_overdue_count || ' فاتورة متأخرة بمبلغ ' || v_overdue_amount || ' ريال إلى ' || v_next_label || ' وتُحسب فيها عند التحصيل',
        'warning', '/dashboard/invoices');
    END IF;
    IF v_carried_invoices > 0 THEN
      v_warnings := array_append(v_warnings, 'تم ترحيل ' || v_carried_invoices || ' فاتورة غير مسددة للسنة التالية');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'closed_label', v_fy.label,
    'next_label', v_next_label,
    'carried_invoices', COALESCE(v_carried_invoices, 0),
    'carried_overdue', v_overdue_count,
    'carried_overdue_amount', v_overdue_amount,
    'distributions_amount', v_actual_distributions,
    'warnings', to_jsonb(v_warnings)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.pay_invoice_and_record_collection(p_invoice_id uuid, p_paid_amount numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_contract RECORD;
  v_paid_amount numeric;
  v_old_paid_months int;
  v_fiscal_year_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتسديد الفواتير';
  END IF;

  SELECT * INTO v_invoice FROM payment_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة';
  END IF;
  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'الفاتورة مسددة بالفعل';
  END IF;

  SELECT * INTO v_contract FROM contracts WHERE id = v_invoice.contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'العقد المرتبط غير موجود';
  END IF;

  v_paid_amount := COALESCE(p_paid_amount, v_invoice.amount);
  v_fiscal_year_id := v_invoice.fiscal_year_id;

  UPDATE payment_invoices
  SET status = 'paid',
      paid_date = CURRENT_DATE,
      paid_amount = v_paid_amount,
      updated_at = now()
  WHERE id = p_invoice_id;

  SELECT COALESCE(tp.paid_months, 0) INTO v_old_paid_months
  FROM tenant_payments tp WHERE tp.contract_id = v_contract.id FOR UPDATE;

  IF v_old_paid_months IS NULL THEN
    v_old_paid_months := 0;
    INSERT INTO tenant_payments (contract_id, paid_months, notes)
    VALUES (v_contract.id, 1, 'تحصيل تلقائي من فاتورة ' || v_invoice.invoice_number);
  ELSE
    UPDATE tenant_payments
    SET paid_months = v_old_paid_months + 1,
        notes = 'تحصيل تلقائي من فاتورة ' || v_invoice.invoice_number,
        updated_at = now()
    WHERE contract_id = v_contract.id;
  END IF;

  -- قيد الدخل يُؤرَّخ بشهر الاستحقاق، والمتأخرات المرحّلة بتاريخ التحصيل في السنة الجديدة
  INSERT INTO income (source, amount, date, property_id, contract_id, fiscal_year_id, notes)
  VALUES (
    'إيجار - ' || v_contract.tenant_name,
    v_paid_amount,
    CASE WHEN v_invoice.origin_fiscal_year_id IS NOT NULL THEN CURRENT_DATE ELSE v_invoice.due_date END,
    v_contract.property_id,
    v_contract.id,
    v_fiscal_year_id,
    'تحصيل تلقائي - فاتورة ' || v_invoice.invoice_number || ' - الدفعة رقم ' || v_invoice.payment_number
      || CASE WHEN v_invoice.origin_fiscal_year_id IS NOT NULL THEN ' - متأخرات مرحّلة من سنة سابقة' ELSE '' END
  );

  RETURN jsonb_build_object(
    'success', true,
    'invoice_number', v_invoice.invoice_number,
    'paid_amount', v_paid_amount,
    'new_paid_months', v_old_paid_months + 1
  );
END;
$function$;