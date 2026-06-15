-- ════════════════════════════════════════════════════════════════════════
-- R1/W6-001: حذف jwt_role() — لم تعد مستخدمة في أي policy حية
-- ════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.jwt_role();

-- ════════════════════════════════════════════════════════════════════════
-- R1/W7-006: RPC ذرّي لإنشاء العقد + الفواتير في معاملة واحدة
-- ════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.create_contract_with_invoices(
  p_contract jsonb
)
RETURNS TABLE(contract_id uuid, invoice_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id uuid;
  v_invoice_count integer := 0;
BEGIN
  -- صلاحية: ناظر أو محاسب فقط
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'صلاحية مرفوضة: إنشاء العقد يتطلب دور ناظر أو محاسب'
      USING ERRCODE = '42501';
  END IF;

  -- إدراج العقد (jsonb_populate_record يحترم العمود-إلى-المفتاح)
  INSERT INTO public.contracts
  SELECT * FROM jsonb_populate_record(NULL::public.contracts, p_contract)
  RETURNING id INTO v_contract_id;

  IF v_contract_id IS NULL THEN
    RAISE EXCEPTION 'فشل إنشاء العقد: لم يُرجع معرف';
  END IF;

  -- توليد فواتير الدفعات (داخل نفس المعاملة — أي فشل يُسترجع العقد)
  BEGIN
    SELECT public.generate_contract_invoices(v_contract_id) INTO v_invoice_count;
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'فشل توليد فواتير العقد %: %', v_contract_id, SQLERRM;
  END;

  RETURN QUERY SELECT v_contract_id, COALESCE(v_invoice_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.create_contract_with_invoices(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_contract_with_invoices(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_contract_with_invoices(jsonb) TO service_role;

COMMENT ON FUNCTION public.create_contract_with_invoices(jsonb) IS
'R1/W7-006: إنشاء العقد + توليد فواتيره في معاملة ذرّية واحدة. يضمن عدم وجود عقود يتيمة بلا فواتير.';