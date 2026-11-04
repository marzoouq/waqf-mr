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

  -- تاريخ السداد الفعلي يبقى محفوظاً في الفاتورة
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

  -- قيد الدخل يُؤرَّخ بشهر استحقاق القسط
  INSERT INTO income (source, amount, date, property_id, contract_id, fiscal_year_id, notes)
  VALUES (
    'إيجار - ' || v_contract.tenant_name,
    v_paid_amount,
    v_invoice.due_date,
    v_contract.property_id,
    v_contract.id,
    v_fiscal_year_id,
    'تحصيل تلقائي - فاتورة ' || v_invoice.invoice_number || ' - الدفعة رقم ' || v_invoice.payment_number
  );

  RETURN jsonb_build_object(
    'success', true,
    'invoice_number', v_invoice.invoice_number,
    'paid_amount', v_paid_amount,
    'new_paid_months', v_old_paid_months + 1
  );
END;
$function$;