
-- دالة تسديد الفاتورة مع تسجيل التحصيل تلقائياً
CREATE OR REPLACE FUNCTION public.pay_invoice_and_record_collection(
  p_invoice_id uuid,
  p_paid_amount numeric DEFAULT NULL
)
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
  -- التحقق من الصلاحية
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتسديد الفواتير';
  END IF;

  -- جلب الفاتورة مع القفل
  SELECT * INTO v_invoice FROM payment_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة';
  END IF;
  IF v_invoice.status = 'paid' THEN
    RAISE EXCEPTION 'الفاتورة مسددة بالفعل';
  END IF;

  -- جلب بيانات العقد
  SELECT * INTO v_contract FROM contracts WHERE id = v_invoice.contract_id;
  IF v_contract IS NULL THEN
    RAISE EXCEPTION 'العقد المرتبط غير موجود';
  END IF;

  v_paid_amount := COALESCE(p_paid_amount, v_invoice.amount);
  v_fiscal_year_id := v_invoice.fiscal_year_id;

  -- 1) تحديث الفاتورة
  UPDATE payment_invoices
  SET status = 'paid',
      paid_date = CURRENT_DATE,
      paid_amount = v_paid_amount,
      updated_at = now()
  WHERE id = p_invoice_id;

  -- 2) تحديث tenant_payments (زيادة paid_months بمقدار 1)
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

  -- 3) تسجيل الدخل
  INSERT INTO income (source, amount, date, property_id, contract_id, fiscal_year_id, notes)
  VALUES (
    'إيجار - ' || v_contract.tenant_name,
    v_paid_amount,
    CURRENT_DATE,
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

-- دالة التراجع عن تسديد الفاتورة
CREATE OR REPLACE FUNCTION public.unpay_invoice_and_revert_collection(
  p_invoice_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice RECORD;
  v_contract RECORD;
  v_old_paid_months int;
  v_new_status text;
  v_deleted_income int;
BEGIN
  -- التحقق من الصلاحية
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بإلغاء تسديد الفواتير';
  END IF;

  -- جلب الفاتورة مع القفل
  SELECT * INTO v_invoice FROM payment_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF v_invoice IS NULL THEN
    RAISE EXCEPTION 'الفاتورة غير موجودة';
  END IF;
  IF v_invoice.status != 'paid' THEN
    RAISE EXCEPTION 'الفاتورة ليست مسددة';
  END IF;

  -- جلب العقد
  SELECT * INTO v_contract FROM contracts WHERE id = v_invoice.contract_id;

  -- تحديد الحالة الجديدة
  IF v_invoice.due_date < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := 'pending';
  END IF;

  -- 1) إعادة حالة الفاتورة
  UPDATE payment_invoices
  SET status = v_new_status,
      paid_date = NULL,
      paid_amount = 0,
      updated_at = now()
  WHERE id = p_invoice_id;

  -- 2) إنقاص paid_months
  SELECT COALESCE(tp.paid_months, 0) INTO v_old_paid_months
  FROM tenant_payments tp WHERE tp.contract_id = v_invoice.contract_id FOR UPDATE;

  IF v_old_paid_months IS NOT NULL AND v_old_paid_months > 0 THEN
    UPDATE tenant_payments
    SET paid_months = v_old_paid_months - 1,
        updated_at = now()
    WHERE contract_id = v_invoice.contract_id;
  END IF;

  -- 3) حذف سجل الدخل المرتبط (الأحدث المطابق)
  DELETE FROM income
  WHERE id = (
    SELECT id FROM income
    WHERE contract_id = v_invoice.contract_id
      AND amount = v_invoice.amount
      AND notes LIKE '%فاتورة ' || v_invoice.invoice_number || '%'
    ORDER BY created_at DESC
    LIMIT 1
  );
  GET DIAGNOSTICS v_deleted_income = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'invoice_number', v_invoice.invoice_number,
    'new_status', v_new_status,
    'new_paid_months', GREATEST(COALESCE(v_old_paid_months, 1) - 1, 0),
    'income_deleted', v_deleted_income
  );
END;
$function$;
