
-- دالة RPC ذرية لتحديث تخصيصات العقود في transaction واحد
CREATE OR REPLACE FUNCTION public.upsert_contract_allocations(
  p_contract_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alloc jsonb;
BEGIN
  -- التحقق من الصلاحية
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتعديل تخصيصات العقود';
  END IF;

  -- حذف التخصيصات القديمة
  DELETE FROM public.contract_fiscal_allocations
  WHERE contract_id = p_contract_id;

  -- إدراج التخصيصات الجديدة
  FOR alloc IN SELECT * FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO public.contract_fiscal_allocations (
      contract_id, fiscal_year_id, period_start, period_end,
      allocated_payments, allocated_amount
    ) VALUES (
      p_contract_id,
      (alloc->>'fiscal_year_id')::uuid,
      (alloc->>'period_start')::date,
      (alloc->>'period_end')::date,
      COALESCE((alloc->>'allocated_payments')::integer, 0),
      COALESCE((alloc->>'allocated_amount')::numeric, 0)
    );
  END LOOP;
END;
$$;
