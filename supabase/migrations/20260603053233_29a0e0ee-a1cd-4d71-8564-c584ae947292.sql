-- Fix: get_beneficiary_dashboard now computes estimated available_amount and my_share
-- for ACTIVE fiscal years using the same formula as get_dashboard_full_summary
-- (waqf_revenue - waqf_corpus_manual). Adds my_share_is_estimated flag for the UI.
-- Resolves cross-dashboard inconsistency where beneficiary saw 0 while admin saw real numbers.

CREATE OR REPLACE FUNCTION public.get_beneficiary_dashboard(p_fiscal_year_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_ben RECORD;
  v_total_pct numeric;
  v_ben_count integer;
  v_fy RECORD;
  v_total_income numeric := 0;
  v_total_expenses numeric := 0;
  v_account RECORD;
  v_distributions jsonb := '[]'::jsonb;
  v_pending_count integer := 0;
  v_advance_settings text := null;
  v_available_amount numeric := 0;
  v_my_share numeric := 0;
  v_my_share_is_estimated boolean := false;
  v_income_by_source jsonb := '[]'::jsonb;
  v_expenses_by_type jsonb := '[]'::jsonb;
  v_monthly_income jsonb := '[]'::jsonb;
  v_monthly_expenses jsonb := '[]'::jsonb;
  v_admin_share_pct numeric := 0;
  v_waqif_share_pct numeric := 0;
  v_settings_raw text;
  v_my_advances jsonb := '[]'::jsonb;
  v_paid_advances_total numeric := 0;
  v_my_carryforwards jsonb := '[]'::jsonb;
  v_carryforward_balance numeric := 0;
  v_total_received numeric := 0;
BEGIN
  SELECT id, name, share_percentage, user_id INTO v_ben FROM beneficiaries WHERE user_id = v_user_id LIMIT 1;
  IF v_ben.id IS NULL THEN
    RETURN jsonb_build_object('beneficiary', null, 'error', 'not_linked');
  END IF;

  SELECT COALESCE(SUM(share_percentage), 0), COUNT(*) INTO v_total_pct, v_ben_count FROM beneficiaries;

  SELECT value INTO v_settings_raw FROM app_settings WHERE key = 'percentage_settings';
  IF v_settings_raw IS NOT NULL THEN
    BEGIN
      v_admin_share_pct := COALESCE((v_settings_raw::jsonb ->> 'admin_share_percentage')::numeric, 0);
      v_waqif_share_pct := COALESCE((v_settings_raw::jsonb ->> 'waqif_share_percentage')::numeric, 0);
    EXCEPTION WHEN OTHERS THEN
      v_admin_share_pct := 0; v_waqif_share_pct := 0;
    END;
  END IF;

  IF p_fiscal_year_id IS NOT NULL THEN
    SELECT id, label, status, start_date, end_date, published INTO v_fy
      FROM fiscal_years
     WHERE id = p_fiscal_year_id
       AND (published = true OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'accountant'));
  END IF;

  IF v_fy.id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_income FROM income WHERE fiscal_year_id = v_fy.id;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses FROM expenses WHERE fiscal_year_id = v_fy.id;

    SELECT admin_share, waqif_share, waqf_revenue, vat_amount,
           zakat_amount, net_after_expenses, net_after_vat,
           waqf_corpus_manual, waqf_corpus_previous,
           distributions_amount, total_income AS acc_income, total_expenses AS acc_expenses
      INTO v_account FROM accounts WHERE fiscal_year_id = v_fy.id LIMIT 1;

    -- ── Unified share computation across closed AND active years ──
    -- Matches get_dashboard_full_summary formula: available = waqf_revenue - waqf_corpus_manual.
    -- For active years the values are estimates (account snapshot may not be final);
    -- we mark them with my_share_is_estimated=true so the UI shows the right badge.
    IF v_account.waqf_revenue IS NOT NULL THEN
      v_available_amount := GREATEST(0, COALESCE(v_account.waqf_revenue, 0) - COALESCE(v_account.waqf_corpus_manual, 0));
      IF v_total_pct > 0 THEN
        v_my_share := ROUND(v_available_amount * COALESCE(v_ben.share_percentage, 0) / v_total_pct, 2);
      END IF;
      v_my_share_is_estimated := (v_fy.status <> 'closed');
    END IF;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('source', sub.source, 'total', sub.t)), '[]'::jsonb)
      INTO v_income_by_source
      FROM (SELECT source, SUM(amount) AS t FROM income WHERE fiscal_year_id = v_fy.id GROUP BY source) sub;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('expense_type', sub.expense_type, 'total', sub.t)), '[]'::jsonb)
      INTO v_expenses_by_type
      FROM (
        SELECT expense_type, SUM(amount) AS t FROM expenses
        WHERE fiscal_year_id = v_fy.id
          AND lower(trim(expense_type)) NOT IN ('ضريبة القيمة المضافة', 'vat', 'ضريبة قيمة مضافة')
        GROUP BY expense_type
      ) sub;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('month', sub.m, 'total', sub.t) ORDER BY sub.m), '[]'::jsonb)
      INTO v_monthly_income
      FROM (SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t FROM income WHERE fiscal_year_id = v_fy.id GROUP BY 1) sub;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('month', sub.m, 'total', sub.t) ORDER BY sub.m), '[]'::jsonb)
      INTO v_monthly_expenses
      FROM (SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t FROM expenses WHERE fiscal_year_id = v_fy.id GROUP BY 1) sub;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb), '[]'::jsonb) INTO v_distributions
    FROM (
      SELECT d.id, d.amount, d.date, d.status, d.fiscal_year_id, fy.label AS fiscal_year_label
        FROM distributions d
        LEFT JOIN fiscal_years fy ON fy.id = d.fiscal_year_id
       WHERE d.beneficiary_id = v_ben.id
         AND (d.fiscal_year_id IS NULL OR fy.published = true OR has_role(v_user_id, 'admin') OR has_role(v_user_id, 'accountant'))
       ORDER BY d.date DESC LIMIT 3
    ) d;

  -- Total received (paid distributions) scoped to selected fiscal year
  SELECT COALESCE(SUM(amount), 0) INTO v_total_received FROM distributions
   WHERE beneficiary_id = v_ben.id AND status = 'paid'
     AND (p_fiscal_year_id IS NULL OR fiscal_year_id = p_fiscal_year_id);

  IF v_fy.id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_pending_count FROM advance_requests
     WHERE beneficiary_id = v_ben.id AND fiscal_year_id = v_fy.id AND status = 'pending';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(a)::jsonb ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_my_advances
    FROM (
      SELECT id, beneficiary_id, fiscal_year_id, amount, reason, status,
             rejection_reason, approved_by, approved_at, paid_at, created_at
        FROM advance_requests WHERE beneficiary_id = v_ben.id
       ORDER BY created_at DESC LIMIT 100
    ) a;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances_total FROM advance_requests
   WHERE beneficiary_id = v_ben.id AND status = 'paid'
     AND (p_fiscal_year_id IS NULL OR fiscal_year_id = p_fiscal_year_id);

  SELECT COALESCE(jsonb_agg(row_to_json(c)::jsonb ORDER BY c.created_at DESC), '[]'::jsonb) INTO v_my_carryforwards
    FROM (
      SELECT id, beneficiary_id, from_fiscal_year_id, to_fiscal_year_id, amount, status, notes, created_at
        FROM advance_carryforward WHERE beneficiary_id = v_ben.id
       ORDER BY created_at DESC LIMIT 100
    ) c;

  SELECT COALESCE(SUM(amount), 0) INTO v_carryforward_balance FROM advance_carryforward
   WHERE beneficiary_id = v_ben.id AND status = 'active'
     AND (p_fiscal_year_id IS NULL OR to_fiscal_year_id = p_fiscal_year_id OR to_fiscal_year_id IS NULL);

  SELECT value INTO v_advance_settings FROM app_settings WHERE key = 'advance_settings';

  RETURN jsonb_build_object(
    'beneficiary', jsonb_build_object(
      'id', v_ben.id, 'name', v_ben.name,
      'share_percentage', v_ben.share_percentage, 'user_id', v_ben.user_id
    ),
    'total_beneficiary_percentage', v_total_pct,
    'beneficiary_count', v_ben_count,
    'admin_share_pct', v_admin_share_pct,
    'waqif_share_pct', v_waqif_share_pct,
    'fiscal_year', CASE WHEN v_fy.id IS NOT NULL THEN jsonb_build_object(
      'id', v_fy.id, 'label', v_fy.label, 'status', v_fy.status,
      'start_date', v_fy.start_date, 'end_date', v_fy.end_date
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
      'net_after_zakat', COALESCE(v_account.net_after_vat, 0) - COALESCE(v_account.zakat_amount, 0),
      'waqf_corpus_manual', v_account.waqf_corpus_manual,
      'waqf_corpus_previous', v_account.waqf_corpus_previous,
      'distributions_amount', v_account.distributions_amount
    ) ELSE null END,
    'available_amount', v_available_amount,
    'my_share', v_my_share,
    'my_share_is_estimated', v_my_share_is_estimated,
    'total_received', v_total_received,
    'recent_distributions', v_distributions,
    'pending_advance_count', v_pending_count,
    'advance_settings', CASE WHEN v_advance_settings IS NOT NULL THEN v_advance_settings::jsonb ELSE null END,
    'income_by_source', v_income_by_source,
    'expenses_by_type_excluding_vat', v_expenses_by_type,
    'monthly_income', v_monthly_income,
    'monthly_expenses', v_monthly_expenses,
    'my_advances', v_my_advances,
    'paid_advances_total', v_paid_advances_total,
    'my_carryforwards', v_my_carryforwards,
    'carryforward_balance', v_carryforward_balance
  );
END;
$function$;