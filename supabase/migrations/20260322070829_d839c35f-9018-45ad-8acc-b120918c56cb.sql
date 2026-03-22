CREATE OR REPLACE FUNCTION public.get_beneficiary_dashboard(p_fiscal_year_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_ben RECORD;
  v_total_pct numeric;
  v_fy RECORD;
  v_total_income numeric := 0;
  v_total_expenses numeric := 0;
  v_account RECORD;
  v_distributions jsonb := '[]'::jsonb;
  v_pending_count integer := 0;
  v_advance_settings text := null;
  v_available_amount numeric := 0;
  v_my_share numeric := 0;
BEGIN
  -- 1) المستفيد الحالي
  SELECT id, name, share_percentage, user_id
    INTO v_ben
    FROM beneficiaries
   WHERE user_id = v_user_id
   LIMIT 1;

  IF v_ben.id IS NULL THEN
    RETURN jsonb_build_object('beneficiary', null, 'error', 'not_linked');
  END IF;

  -- 2) إجمالي نسب المستفيدين
  SELECT COALESCE(SUM(share_percentage), 0) INTO v_total_pct FROM beneficiaries;

  -- 3) السنة المالية (مع فحص published)
  IF p_fiscal_year_id IS NOT NULL THEN
    SELECT id, label, status, start_date, end_date, published
      INTO v_fy
      FROM fiscal_years
     WHERE id = p_fiscal_year_id
       AND (published = true OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'accountant'));
  END IF;

  -- 4) بيانات مالية (فقط إذا وُجدت سنة صالحة)
  IF v_fy.id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_income
      FROM income WHERE fiscal_year_id = v_fy.id;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
      FROM expenses WHERE fiscal_year_id = v_fy.id;

    SELECT admin_share, waqif_share, waqf_revenue, vat_amount,
           zakat_amount, net_after_expenses, net_after_vat,
           waqf_corpus_manual, waqf_corpus_previous,
           distributions_amount, total_income AS acc_income, total_expenses AS acc_expenses
      INTO v_account
      FROM accounts
     WHERE fiscal_year_id = v_fy.id
     LIMIT 1;

    -- حساب المبلغ المتاح وحصة المستفيد (فقط عند الإقفال)
    IF v_fy.status = 'closed' AND v_account.waqf_revenue IS NOT NULL THEN
      v_available_amount := COALESCE(v_account.waqf_revenue, 0) - COALESCE(v_account.waqf_corpus_manual, 0);
      IF v_total_pct > 0 THEN
        v_my_share := ROUND(v_available_amount * COALESCE(v_ben.share_percentage, 0) / v_total_pct, 2);
      END IF;
    END IF;
  END IF;

  -- 5) آخر 3 توزيعات — مع فلتر السنوات المنشورة فقط
  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb), '[]'::jsonb)
    INTO v_distributions
    FROM (
      SELECT d.id, d.amount, d.date, d.status
        FROM distributions d
        LEFT JOIN fiscal_years fy ON fy.id = d.fiscal_year_id
       WHERE d.beneficiary_id = v_ben.id
         AND (d.fiscal_year_id IS NULL OR fy.published = true
              OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'accountant'))
       ORDER BY d.date DESC
       LIMIT 3
    ) d;

  -- 6) عدد طلبات السُلف المعلقة
  IF v_fy.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_pending_count
      FROM advance_requests
     WHERE beneficiary_id = v_ben.id
       AND fiscal_year_id = v_fy.id
       AND status = 'pending';
  END IF;

  -- 7) إعدادات السُلف
  SELECT value INTO v_advance_settings
    FROM app_settings
   WHERE key = 'advance_settings';

  -- 8) بناء الاستجابة
  RETURN jsonb_build_object(
    'beneficiary', jsonb_build_object(
      'id', v_ben.id,
      'name', v_ben.name,
      'share_percentage', v_ben.share_percentage
    ),
    'total_beneficiary_percentage', v_total_pct,
    'fiscal_year', CASE WHEN v_fy.id IS NOT NULL THEN jsonb_build_object(
      'id', v_fy.id,
      'label', v_fy.label,
      'status', v_fy.status,
      'start_date', v_fy.start_date,
      'end_date', v_fy.end_date
    ) ELSE null END,
    'total_income', v_total_income,
    'total_expenses', v_total_expenses,
    'account', CASE WHEN v_account.waqf_revenue IS NOT NULL THEN jsonb_build_object(
      'admin_share', v_account.admin_share,
      'waqif_share', v_account.waqif_share,
      'waqf_revenue', v_account.waqf_revenue,
      'vat_amount', v_account.vat_amount,
      'zakat_amount', v_account.zakat_amount,
      'net_after_expenses', v_account.net_after_expenses,
      'net_after_vat', v_account.net_after_vat,
      'waqf_corpus_manual', v_account.waqf_corpus_manual,
      'waqf_corpus_previous', v_account.waqf_corpus_previous,
      'distributions_amount', v_account.distributions_amount
    ) ELSE null END,
    'available_amount', v_available_amount,
    'my_share', v_my_share,
    'recent_distributions', v_distributions,
    'pending_advance_count', v_pending_count,
    'advance_settings', CASE WHEN v_advance_settings IS NOT NULL
      THEN v_advance_settings::jsonb ELSE null END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_beneficiary_dashboard FROM anon;
GRANT EXECUTE ON FUNCTION public.get_beneficiary_dashboard TO authenticated;