-- شجرة التدقيق: مطابقة قراءة فقط للفواتير والقيود والسندات مع القوائم
CREATE OR REPLACE FUNCTION public.audit_reconciliation(p_fiscal_year_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_fy record;
  v_acc record;
  v_issues jsonb := '[]'::jsonb;
  v_income_total numeric;
  v_expense_total numeric;
  v_paid_total numeric;
  v_props jsonb;
  v_exp jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'السنة المالية غير موجودة'; END IF;

  SELECT COALESCE(sum(amount),0) INTO v_income_total FROM income WHERE fiscal_year_id = p_fiscal_year_id;
  SELECT COALESCE(sum(amount),0) INTO v_expense_total FROM expenses WHERE fiscal_year_id = p_fiscal_year_id;
  SELECT COALESCE(sum(COALESCE(paid_amount, amount)),0) INTO v_paid_total
    FROM payment_invoices WHERE fiscal_year_id = p_fiscal_year_id AND status = 'paid';

  -- فاتورة مسددة بلا قيد دخل
  v_issues := v_issues || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','paid_invoice_without_income','severity','high',
      'message','فاتورة مسددة بلا قيد دخل: ' || pi.invoice_number,
      'ref', pi.invoice_number, 'amount', COALESCE(pi.paid_amount, pi.amount)))
    FROM payment_invoices pi
    WHERE pi.fiscal_year_id = p_fiscal_year_id AND pi.status = 'paid'
      AND NOT EXISTS (SELECT 1 FROM income i WHERE i.contract_id = pi.contract_id
        AND i.notes LIKE '%' || pi.invoice_number || '%')), '[]'::jsonb);

  -- مبلغ القيد يختلف عن المسدد
  v_issues := v_issues || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','income_amount_mismatch','severity','high',
      'message','مبلغ قيد الدخل يختلف عن المسدد في الفاتورة ' || pi.invoice_number,
      'ref', pi.invoice_number, 'amount', i.amount, 'expected', COALESCE(pi.paid_amount, pi.amount)))
    FROM payment_invoices pi
    JOIN income i ON i.contract_id = pi.contract_id AND i.notes LIKE '%' || pi.invoice_number || '%'
    WHERE pi.fiscal_year_id = p_fiscal_year_id AND pi.status = 'paid'
      AND round(i.amount,2) <> round(COALESCE(pi.paid_amount, pi.amount),2)), '[]'::jsonb);

  -- فاتورة مسددة بلا سند قبض
  v_issues := v_issues || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','paid_invoice_without_receipt','severity','medium',
      'message','فاتورة مسددة بلا سند قبض: ' || pi.invoice_number,
      'ref', pi.invoice_number))
    FROM payment_invoices pi
    WHERE pi.fiscal_year_id = p_fiscal_year_id AND pi.status = 'paid'
      AND NOT EXISTS (SELECT 1 FROM receipt_vouchers r WHERE r.payment_invoice_id = pi.id AND r.status <> 'void')), '[]'::jsonb);

  -- قيد دخل لعقد بلا فاتورة مطابقة
  v_issues := v_issues || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','income_without_invoice','severity','medium',
      'message','قيد دخل غير مرتبط بفاتورة إيجار: ' || i.source,
      'ref', i.id, 'amount', i.amount))
    FROM income i
    WHERE i.fiscal_year_id = p_fiscal_year_id AND i.contract_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM payment_invoices pi WHERE pi.contract_id = i.contract_id
        AND i.notes LIKE '%' || pi.invoice_number || '%')), '[]'::jsonb);

  -- سند صرف معتمد بمبلغ مختلف عن المصروف
  v_issues := v_issues || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','voucher_amount_mismatch','severity','high',
      'message','سند الصرف ' || v.voucher_number || ' يختلف مبلغه عن المصروف',
      'ref', v.voucher_number, 'amount', v.amount, 'expected', e.amount))
    FROM disbursement_vouchers v JOIN expenses e ON e.id = v.expense_id
    WHERE v.fiscal_year_id = p_fiscal_year_id AND v.status = 'approved'
      AND round(v.amount,2) <> round(e.amount,2)), '[]'::jsonb);

  -- سجلات بتاريخ خارج حدود السنة
  v_issues := v_issues || COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'code','record_outside_fiscal_year','severity','low',
      'message', t.kind || ' بتاريخ ' || t.d || ' خارج حدود السنة', 'ref', t.id, 'amount', t.amount))
    FROM (
      SELECT 'قيد دخل' kind, id, date d, amount FROM income WHERE fiscal_year_id = p_fiscal_year_id
      UNION ALL SELECT 'مصروف', id, date, amount FROM expenses WHERE fiscal_year_id = p_fiscal_year_id
    ) t WHERE t.d < v_fy.start_date OR t.d > v_fy.end_date), '[]'::jsonb);

  -- مطابقة القائمة الختامية للسنة المقفلة فقط (المفتوحة تُحسب ديناميكياً)
  SELECT * INTO v_acc FROM accounts WHERE fiscal_year_id = p_fiscal_year_id LIMIT 1;
  IF v_fy.status = 'closed' AND v_acc IS NOT NULL THEN
    IF round(v_acc.total_income,2) <> round(v_income_total,2) THEN
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('code','statement_income_mismatch','severity','high',
        'message','إجمالي الإيرادات في القائمة الختامية لا يطابق قيود الدخل', 'amount', v_acc.total_income, 'expected', v_income_total));
    END IF;
    IF round(v_acc.total_expenses,2) <> round(v_expense_total,2) THEN
      v_issues := v_issues || jsonb_build_array(jsonb_build_object('code','statement_expense_mismatch','severity','high',
        'message','إجمالي المصروفات في القائمة الختامية لا يطابق المصروفات', 'amount', v_acc.total_expenses, 'expected', v_expense_total));
    END IF;
  END IF;

  -- شجرة الإيرادات: عقار ← عقد ← فواتير
  SELECT COALESCE(jsonb_agg(p ORDER BY p->>'label'), '[]'::jsonb) INTO v_props FROM (
    SELECT jsonb_build_object('label', COALESCE(pr.property_number, 'بدون عقار'),
      'amount', COALESCE(sum(i.amount),0),
      'children', COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'label', c.contract_number || ' — ' || c.tenant_name,
          'amount', (SELECT COALESCE(sum(amount),0) FROM income WHERE contract_id = c.id AND fiscal_year_id = p_fiscal_year_id),
          'invoiced', (SELECT COALESCE(sum(COALESCE(paid_amount,amount)),0) FROM payment_invoices WHERE contract_id = c.id AND fiscal_year_id = p_fiscal_year_id AND status='paid'),
          'paid_count', (SELECT count(*) FROM payment_invoices WHERE contract_id = c.id AND fiscal_year_id = p_fiscal_year_id AND status='paid'),
          'receipt_count', (SELECT count(*) FROM receipt_vouchers r JOIN payment_invoices pi ON pi.id = r.payment_invoice_id WHERE pi.contract_id = c.id AND pi.fiscal_year_id = p_fiscal_year_id AND r.status <> 'void')))
        FROM contracts c WHERE c.property_id = pr.id
          AND EXISTS (SELECT 1 FROM income WHERE contract_id = c.id AND fiscal_year_id = p_fiscal_year_id)), '[]'::jsonb)) p
    FROM income i LEFT JOIN properties pr ON pr.id = i.property_id
    WHERE i.fiscal_year_id = p_fiscal_year_id
    GROUP BY pr.id, pr.property_number
  ) s(p);

  -- شجرة المصروفات: نوع ← عدد السندات
  SELECT COALESCE(jsonb_agg(jsonb_build_object('label', expense_type, 'amount', total,
      'count', cnt, 'voucher_count', vcnt) ORDER BY total DESC), '[]'::jsonb) INTO v_exp
  FROM (SELECT e.expense_type, sum(e.amount) total, count(*) cnt,
          count(v.id) FILTER (WHERE v.status = 'approved') vcnt
        FROM expenses e LEFT JOIN disbursement_vouchers v ON v.expense_id = e.id
        WHERE e.fiscal_year_id = p_fiscal_year_id GROUP BY e.expense_type) x;

  RETURN jsonb_build_object(
    'fiscal_year', v_fy.label, 'status', v_fy.status,
    'income_total', v_income_total, 'paid_invoices_total', v_paid_total,
    'expense_total', v_expense_total,
    'statement_income', CASE WHEN v_fy.status='closed' THEN v_acc.total_income END,
    'statement_expenses', CASE WHEN v_fy.status='closed' THEN v_acc.total_expenses END,
    'income_tree', v_props, 'expense_tree', v_exp,
    'issues', v_issues, 'checked_at', now());
END;
$$;
REVOKE ALL ON FUNCTION public.audit_reconciliation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_reconciliation(uuid) TO authenticated;

-- الوثائق المعتمدة الصادرة من الناظر
CREATE TABLE public.official_letters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  letter_type text NOT NULL,
  recipient text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  doc_number text,
  verification_code text,
  status text NOT NULL DEFAULT 'issued',
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.official_letters TO authenticated;
GRANT ALL ON public.official_letters TO service_role;
ALTER TABLE public.official_letters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_select_official_letters" ON public.official_letters FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin_insert_official_letters" ON public.official_letters FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) AND issued_by = auth.uid());
CREATE POLICY "admin_update_official_letters" ON public.official_letters FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- إلغاء وثيقة معتمدة يظهر في صفحة التحقق
CREATE OR REPLACE FUNCTION public.void_official_letter(p_letter_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_num text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  UPDATE official_letters SET status = 'void' WHERE id = p_letter_id RETURNING doc_number INTO v_num;
  IF v_num IS NOT NULL THEN
    UPDATE issued_documents SET status = 'void' WHERE doc_number = v_num;
  END IF;
END; $$;
REVOKE ALL ON FUNCTION public.void_official_letter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_official_letter(uuid) TO authenticated;