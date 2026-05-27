-- دالة حذف السنة المالية مع كافة بياناتها المرتبطة (للناظر فقط)
CREATE OR REPLACE FUNCTION public.delete_fiscal_year_cascade(p_fiscal_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
  v_deleted jsonb := '{}'::jsonb;
  v_count bigint;
BEGIN
  -- التحقق من الصلاحية: الأدمن فقط
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'permission denied: only admin can cascade-delete a fiscal year';
  END IF;

  -- التأكد من وجود السنة
  SELECT label INTO v_label FROM public.fiscal_years WHERE id = p_fiscal_year_id;
  IF v_label IS NULL THEN
    RAISE EXCEPTION 'fiscal year not found: %', p_fiscal_year_id;
  END IF;

  -- 1) عناصر الفواتير وسلسلة الفواتير لفواتير الدفعات الخاصة بالسنة
  DELETE FROM public.invoice_items
  WHERE invoice_source = 'payment_invoices'
    AND invoice_id IN (SELECT id FROM public.payment_invoices WHERE fiscal_year_id = p_fiscal_year_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoice_items_payment', v_count);

  DELETE FROM public.invoice_chain
  WHERE source_table = 'payment_invoices'
    AND invoice_id IN (SELECT id FROM public.payment_invoices WHERE fiscal_year_id = p_fiscal_year_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoice_chain_payment', v_count);

  -- 2) عناصر الفواتير وسلسلة الفواتير للفواتير الضريبية الخاصة بالسنة
  DELETE FROM public.invoice_items
  WHERE invoice_source = 'invoices'
    AND invoice_id IN (SELECT id FROM public.invoices WHERE fiscal_year_id = p_fiscal_year_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoice_items_invoices', v_count);

  DELETE FROM public.invoice_chain
  WHERE source_table = 'invoices'
    AND invoice_id IN (SELECT id FROM public.invoices WHERE fiscal_year_id = p_fiscal_year_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoice_chain_invoices', v_count);

  -- 3) سندات الصرف ثم المصروفات (السندات تشير إلى expense_id)
  DELETE FROM public.disbursement_vouchers WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('disbursement_vouchers', v_count);

  -- 4) الدخل المرتبط بعقود السنة + الدخل المرتبط مباشرة بالسنة
  DELETE FROM public.income
  WHERE fiscal_year_id = p_fiscal_year_id
     OR contract_id IN (SELECT id FROM public.contracts WHERE fiscal_year_id = p_fiscal_year_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('income', v_count);

  -- 5) فواتير الدفعات
  DELETE FROM public.payment_invoices WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('payment_invoices', v_count);

  -- 6) الفواتير الضريبية
  DELETE FROM public.invoices WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('invoices', v_count);

  -- 7) المصروفات والميزانيات
  DELETE FROM public.expenses WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('expenses', v_count);

  DELETE FROM public.expense_budgets WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('expense_budgets', v_count);

  -- 8) التوزيعات وطلبات السلف والرصيد المرحّل
  DELETE FROM public.distributions WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('distributions', v_count);

  DELETE FROM public.advance_requests WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('advance_requests', v_count);

  DELETE FROM public.advance_carryforward
  WHERE from_fiscal_year_id = p_fiscal_year_id OR to_fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('advance_carryforward', v_count);

  -- 9) التقارير السنوية
  DELETE FROM public.annual_report_items WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('annual_report_items', v_count);

  DELETE FROM public.annual_report_status WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('annual_report_status', v_count);

  -- 10) تخصيصات العقود ثم العقود ثم الحسابات
  DELETE FROM public.contract_fiscal_allocations WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('contract_fiscal_allocations', v_count);

  DELETE FROM public.contracts WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('contracts', v_count);

  DELETE FROM public.accounts WHERE fiscal_year_id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('accounts', v_count);

  -- 11) السنة المالية نفسها
  DELETE FROM public.fiscal_years WHERE id = p_fiscal_year_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('fiscal_years', v_count);

  RETURN jsonb_build_object('success', true, 'label', v_label, 'deleted', v_deleted);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_fiscal_year_cascade(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_fiscal_year_cascade(uuid) TO authenticated;