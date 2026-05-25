CREATE OR REPLACE FUNCTION public.create_disbursement_voucher(
  p_expense_id uuid, p_recipient_name text, p_recipient_id_number text,
  p_recipient_phone text, p_amount numeric, p_payment_method voucher_payment_method,
  p_transfer_reference text, p_work_description text, p_signature_data text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_fy uuid; v_id uuid; v_num text;
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'INSUFFICIENT_PRIVILEGES';
  END IF;
  SELECT fiscal_year_id INTO v_fy FROM public.expenses WHERE id = p_expense_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'EXPENSE_NOT_FOUND'; END IF;
  -- ملاحظة: تم إزالة قيد EXPENSE_HAS_INVOICE.
  -- الفاتورة الضريبية (ZATCA) توثيق ضريبي مستقل عن سند الصرف الداخلي (توثيق نقدي للمستلم).
  -- يجوز وجودهما معاً لنفس المصروف.
  IF EXISTS (SELECT 1 FROM public.disbursement_vouchers WHERE expense_id = p_expense_id AND status <> 'void') THEN
    RAISE EXCEPTION 'EXPENSE_HAS_ACTIVE_VOUCHER';
  END IF;
  v_num := public.generate_voucher_number();
  INSERT INTO public.disbursement_vouchers (
    voucher_number, expense_id, fiscal_year_id,
    recipient_name, recipient_id_number, recipient_phone,
    amount, payment_method, transfer_reference,
    work_description, signature_data, status, created_by
  ) VALUES (
    v_num, p_expense_id, v_fy,
    p_recipient_name, p_recipient_id_number, p_recipient_phone,
    p_amount, p_payment_method, p_transfer_reference,
    p_work_description, p_signature_data, 'draft', auth.uid()
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;