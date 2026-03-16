
-- Update allocate_icv_and_chain to accept and pass source_table
CREATE OR REPLACE FUNCTION public.allocate_icv_and_chain(
  p_invoice_id uuid,
  p_invoice_hash text,
  p_source_table text DEFAULT 'payment_invoices'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_icv int;
  v_previous_hash text;
BEGIN
  -- التحقق من صلاحية المستدعي
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتخصيص ICV';
  END IF;

  -- التحقق من source_table
  IF p_source_table NOT IN ('invoices', 'payment_invoices') THEN
    RAISE EXCEPTION 'source_table غير صالح: %', p_source_table;
  END IF;

  -- الحصول على ICV ذري من الـ Sequence
  v_icv := nextval('public.icv_seq');

  -- الحصول على آخر هاش (PIH)
  SELECT invoice_hash INTO v_previous_hash
  FROM public.invoice_chain
  ORDER BY icv DESC
  LIMIT 1
  FOR UPDATE;

  v_previous_hash := COALESCE(v_previous_hash, '0');

  -- إدراج في السلسلة مع source_table
  INSERT INTO public.invoice_chain (invoice_id, icv, invoice_hash, previous_hash, source_table)
  VALUES (p_invoice_id, v_icv, p_invoice_hash, v_previous_hash, p_source_table);

  RETURN jsonb_build_object(
    'icv', v_icv,
    'previous_hash', v_previous_hash
  );
END;
$$;
