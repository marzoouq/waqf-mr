CREATE OR REPLACE FUNCTION public.create_contract_with_invoices(p_contract jsonb)
 RETURNS TABLE(contract_id uuid, invoice_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_contract_id uuid;
  v_invoice_count integer := 0;
  v_payload jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'صلاحية مرفوضة: إنشاء العقد يتطلب دور ناظر أو محاسب'
      USING ERRCODE = '42501';
  END IF;

  -- jsonb_populate_record يحوّل المفاتيح الغائبة إلى NULL، لذا نملأ القيم الافتراضية أولاً
  v_payload := jsonb_build_object(
      'id', gen_random_uuid(),
      'status', 'active',
      'created_at', now(),
      'updated_at', now(),
      'payment_type', 'annual',
      'payment_count', 1,
      'tenant_id_type', 'NAT'
    ) || jsonb_strip_nulls(p_contract);

  INSERT INTO public.contracts
  SELECT * FROM jsonb_populate_record(NULL::public.contracts, v_payload)
  RETURNING id INTO v_contract_id;

  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'فشل إنشاء العقد: لم يُرجع معرف';
  END IF;

  BEGIN
    SELECT public.generate_contract_invoices(v_contract_id) INTO v_invoice_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'فشل توليد فواتير العقد %: %', v_contract_id, SQLERRM;
  END;

  RETURN QUERY SELECT v_contract_id, COALESCE(v_invoice_count, 0);
END;
$function$;