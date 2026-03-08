
-- RPC: حساب الحد الأقصى للسلفة server-side (يطابق منطق validate_advance_request_amount trigger)
CREATE OR REPLACE FUNCTION public.get_max_advance_amount(
  p_beneficiary_id uuid,
  p_fiscal_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_share_pct numeric;
  v_total_pct numeric;
  v_available_amount numeric;
  v_paid_advances numeric;
  v_estimated_share numeric;
  v_active_carryforward numeric;
  v_effective_share numeric;
  v_max_advance numeric;
  v_max_percentage numeric;
BEGIN
  -- جلب نسبة المستفيد
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = p_beneficiary_id;

  IF v_share_pct IS NULL THEN
    RETURN jsonb_build_object('error', 'المستفيد غير موجود');
  END IF;

  -- مجموع النسب
  SELECT COALESCE(SUM(share_percentage), 100) INTO v_total_pct FROM beneficiaries;

  -- الريع المتاح من الحسابات
  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = p_fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  -- الحصة التقديرية (نفس منطق الـ trigger)
  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;

  -- المرحّلات النشطة
  SELECT COALESCE(SUM(amount), 0) INTO v_active_carryforward
  FROM advance_carryforward
  WHERE beneficiary_id = p_beneficiary_id AND status = 'active';

  -- الحصة الفعلية بعد خصم المرحّلات
  v_effective_share := GREATEST(0, v_estimated_share - v_active_carryforward);

  -- السُلف المدفوعة
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = p_beneficiary_id
    AND fiscal_year_id = p_fiscal_year_id
    AND status = 'paid';

  -- نسبة السلفة القصوى من الإعدادات
  SELECT COALESCE(value::numeric, 50) INTO v_max_percentage
  FROM app_settings WHERE key = 'advance_max_percentage';
  IF v_max_percentage IS NULL THEN v_max_percentage := 50; END IF;

  -- الحد الأقصى المتاح
  v_max_advance := GREATEST(0, (v_effective_share * v_max_percentage / 100) - v_paid_advances);

  RETURN jsonb_build_object(
    'estimated_share', ROUND(v_estimated_share, 2),
    'active_carryforward', ROUND(v_active_carryforward, 2),
    'effective_share', ROUND(v_effective_share, 2),
    'paid_advances', ROUND(v_paid_advances, 2),
    'max_percentage', v_max_percentage,
    'max_advance', ROUND(v_max_advance, 2)
  );
END;
$$;

-- السماح للأدوار المصادق عليها باستخدام الدالة
GRANT EXECUTE ON FUNCTION public.get_max_advance_amount(uuid, uuid) TO authenticated;
