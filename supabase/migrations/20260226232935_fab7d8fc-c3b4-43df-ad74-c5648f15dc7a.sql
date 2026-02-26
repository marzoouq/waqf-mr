CREATE OR REPLACE FUNCTION public.reopen_fiscal_year(
  p_fiscal_year_id uuid,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_label text;
  v_status text;
BEGIN
  -- الناظر فقط
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإعادة فتح السنة المالية';
  END IF;

  SELECT label, status INTO v_label, v_status
  FROM fiscal_years WHERE id = p_fiscal_year_id;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'السنة المالية غير موجودة';
  END IF;
  IF v_status != 'closed' THEN
    RAISE EXCEPTION 'السنة المالية ليست مقفلة';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'سبب إعادة الفتح مطلوب';
  END IF;

  UPDATE fiscal_years SET status = 'active' WHERE id = p_fiscal_year_id;

  INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, user_id)
  VALUES (
    'fiscal_years', 'REOPEN', p_fiscal_year_id,
    jsonb_build_object('status', 'closed'),
    jsonb_build_object('status', 'active', 'reason', p_reason),
    auth.uid()
  );

  RETURN jsonb_build_object('label', v_label);
END;
$$;