CREATE OR REPLACE FUNCTION public.get_dashboard_full_summary(p_fiscal_year_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fy_id uuid;
  v_fy_label text;
  v_fy_status text;
  v_is_closed boolean;
  v_total_income numeric := 0;
  v_total_expenses numeric := 0;
  v_result jsonb;
  v_totals jsonb;
  v_collection jsonb;
  v_occupancy jsonb;
  v_counts jsonb;
  v_monthly jsonb;
  v_expense_types jsonb;
  v_yoy jsonb;
  v_fiscal_years jsonb;
  v_settings jsonb;
  v_dashboard_settings jsonb;
  v_beneficiaries jsonb;
  v_account record;
  v_has_account boolean := false;
  v_admin_pct numeric := 10;
  v_waqif_pct numeric := 5;
  v_waqf_corpus_pct numeric;
  v_vat_amount numeric := 0;
  v_zakat_amount numeric := 0;
  v_waqf_corpus_previous numeric := 0;
  v_waqf_corpus_manual numeric := 0;
  v_distributions_amount numeric := 0;
  v_grand_total numeric;
  v_net_after_expenses numeric;
  v_net_after_vat numeric;
  v_net_after_zakat numeric;
  v_share_base numeric;
  v_admin_share numeric := 0;
  v_waqif_share numeric := 0;
  v_waqf_revenue numeric := 0;
  v_available_amount numeric := 0;
  v_remaining_balance numeric := 0;
  v_paid_count int := 0;
  v_partial_count int := 0;
  v_unpaid_count int := 0;
  v_overdue_count int := 0;
  v_coll_total int := 0;
  v_coll_collected numeric := 0;
  v_coll_expected numeric := 0;
  v_coll_pct int := 0;
  v_rented_units int := 0;
  v_total_units int := 0;
  v_occ_rate int := 0;
  v_properties_count int := 0;
  v_active_contracts int := 0;
  v_beneficiaries_count int := 0;
  v_pending_advances int := 0;
  v_expiring_contracts int := 0;
  v_orphaned_contracts int := 0;
  v_unsubmitted_zatca int := 0;
  v_contractual_revenue numeric := 0;
  v_alloc_total numeric := 0;
  v_prev_fy_id uuid;
  v_prev_label text;
  v_prev_income numeric := 0;
  v_prev_expenses numeric := 0;
  v_has_prev boolean := false;
  v_available_amount_raw numeric := 0;
  v_remaining_balance_raw numeric := 0;
  v_prev_corpus_previous numeric := 0;
  v_prev_vat numeric := 0;
  v_prev_zakat numeric := 0;
  v_prev_net_after_zakat numeric := 0;
  v_prev_account record;
  v_has_prev_account boolean := false;
  v_prev_is_closed boolean := false;
BEGIN
  IF p_fiscal_year_id IS NOT NULL THEN
    SELECT id, label, status INTO v_fy_id, v_fy_label, v_fy_status
    FROM fiscal_years WHERE id = p_fiscal_year_id;
  ELSE
    SELECT id, label, status INTO v_fy_id, v_fy_label, v_fy_status
    FROM fiscal_years WHERE status = 'active' ORDER BY start_date DESC LIMIT 1;
  END IF;

  IF v_fy_id IS NULL THEN
    RETURN jsonb_build_object('error', 'لم يتم العثور على سنة مالية');
  END IF;

  v_is_closed := (v_fy_status = 'closed');

  -- F1: نجلب حساب السنة أولاً، ثم نُقرّر مصدر total_income/total_expenses
  SELECT * INTO v_account FROM accounts WHERE fiscal_year_id = v_fy_id LIMIT 1;
  v_has_account := FOUND;

  -- F1: للسنوات المغلقة مع snapshot صالح — نقرأ totals من accounts بدل scan جداول income/expenses
  IF v_is_closed AND v_has_account
     AND v_account.total_income IS NOT NULL
     AND v_account.total_expenses IS NOT NULL THEN
    v_total_income := v_account.total_income;
    v_total_expenses := v_account.total_expenses;
  ELSE
    SELECT COALESCE(SUM(amount), 0) INTO v_total_income
    FROM income WHERE fiscal_year_id = v_fy_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses
    FROM expenses WHERE fiscal_year_id = v_fy_id;
  END IF;

  SELECT COALESCE(jsonb_object_agg(key, value), '{}'::jsonb)
  INTO v_settings FROM app_settings;

  v_admin_pct := COALESCE((v_settings->>'admin_share_percentage')::numeric, 10);
  v_waqif_pct := COALESCE((v_settings->>'waqif_share_percentage')::numeric, 5);
  v_waqf_corpus_pct := NULLIF(v_settings->>'waqf_corpus_percentage', '')::numeric;
  v_dashboard_settings := jsonb_build_object(
    'admin_share_percentage', v_admin_pct,
    'waqif_share_percentage', v_waqif_pct,
    'waqf_corpus_percentage', v_waqf_corpus_pct
  );

  IF v_has_account THEN
    v_vat_amount := COALESCE(v_account.vat_amount, 0);
    v_zakat_amount := COALESCE(v_account.zakat_amount, 0);
    v_waqf_corpus_previous := COALESCE(v_account.waqf_corpus_previous, 0);
    v_waqf_corpus_manual := COALESCE(v_account.waqf_corpus_manual, 0);
    v_distributions_amount := COALESCE(v_account.distributions_amount, 0);

    IF v_is_closed THEN
      v_grand_total := COALESCE(v_account.total_income, 0) + v_waqf_corpus_previous;
      v_net_after_expenses := COALESCE(v_account.net_after_expenses, 0);
      v_net_after_vat := COALESCE(v_account.net_after_vat, 0);
      v_net_after_zakat := v_net_after_vat - v_zakat_amount;
      v_share_base := GREATEST(0, COALESCE(v_account.total_income, 0) - COALESCE(v_account.total_expenses, 0) - v_zakat_amount);
      v_admin_share := COALESCE(v_account.admin_share, 0);
      v_waqif_share := COALESCE(v_account.waqif_share, 0);
      v_waqf_revenue := COALESCE(v_account.waqf_revenue, 0);
      v_available_amount := v_waqf_revenue - v_waqf_corpus_manual;
      v_remaining_balance := v_available_amount - v_distributions_amount;
    ELSE
      v_grand_total := v_total_income + v_waqf_corpus_previous;
      v_net_after_expenses := v_grand_total - v_total_expenses;
      v_net_after_vat := v_net_after_expenses - v_vat_amount;
      v_net_after_zakat := v_net_after_vat - v_zakat_amount;
      v_share_base := GREATEST(0, v_total_income - v_total_expenses - v_zakat_amount);
      v_admin_share := 0;
      v_waqif_share := 0;
      v_waqf_revenue := 0;
      v_available_amount := 0;
      v_remaining_balance := 0;
    END IF;
  ELSE
    v_grand_total := v_total_income + v_waqf_corpus_previous;
    v_net_after_expenses := v_grand_total - v_total_expenses;
    v_net_after_vat := v_net_after_expenses - v_vat_amount;
    v_net_after_zakat := v_net_after_vat - v_zakat_amount;
    v_share_base := GREATEST(0, v_total_income - v_total_expenses - v_zakat_amount);
    IF v_is_closed THEN
      v_admin_share := ROUND(v_share_base * (v_admin_pct / 100), 2);
      v_waqif_share := ROUND(v_share_base * (v_waqif_pct / 100), 2);
      v_waqf_revenue := ROUND(v_net_after_zakat - v_admin_share - v_waqif_share, 2);
      v_available_amount := ROUND(v_waqf_revenue - v_waqf_corpus_manual, 2);
      v_remaining_balance := ROUND(v_available_amount - v_distributions_amount, 2);
    END IF;
  END IF;

  v_available_amount_raw := v_available_amount;
  v_remaining_balance_raw := v_remaining_balance;
  v_available_amount := GREATEST(0, v_available_amount);
  v_remaining_balance := GREATEST(0, v_remaining_balance);

  SELECT COALESCE(SUM(allocated_amount), 0) INTO v_alloc_total
  FROM contract_fiscal_allocations
  WHERE fiscal_year_id = v_fy_id;

  IF v_alloc_total > 0 THEN
    v_contractual_revenue := v_alloc_total;
  ELSE
    SELECT COALESCE(SUM(rent_amount), 0) INTO v_contractual_revenue
    FROM contracts
    WHERE fiscal_year_id = v_fy_id;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE pi.status = 'paid'),
    COUNT(*) FILTER (WHERE pi.status = 'partially_paid'),
    COUNT(*) FILTER (WHERE pi.status NOT IN ('paid', 'partially_paid')),
    COUNT(*) FILTER (WHERE pi.status = 'overdue'),
    COUNT(*),
    COALESCE(SUM(pi.amount), 0),
    COALESCE(SUM(CASE
      WHEN pi.status = 'paid' THEN pi.amount
      WHEN pi.status = 'partially_paid' THEN COALESCE(pi.paid_amount, 0)
      ELSE 0
    END), 0)
  INTO v_paid_count, v_partial_count, v_unpaid_count, v_overdue_count, v_coll_total, v_coll_expected, v_coll_collected
  FROM payment_invoices pi
  INNER JOIN contracts c ON c.id = pi.contract_id
  WHERE pi.fiscal_year_id = v_fy_id
    AND c.status IN ('active', 'expired')
    AND pi.due_date <= CURRENT_DATE;

  IF v_coll_expected > 0 THEN
    v_coll_pct := ROUND((v_coll_collected / v_coll_expected) * 100);
  END IF;

  SELECT COUNT(*) INTO v_total_units FROM units;

  SELECT COUNT(DISTINCT
    CASE WHEN c.unit_id IS NOT NULL THEN c.unit_id
    ELSE NULL END
  ) INTO v_rented_units
  FROM contracts c
  WHERE c.status = 'active' AND c.unit_id IS NOT NULL;

  v_rented_units := v_rented_units + (
    SELECT COUNT(DISTINCT u.id)
    FROM units u
    INNER JOIN contracts c ON c.property_id = u.property_id AND c.unit_id IS NULL AND c.status = 'active'
  );

  IF v_total_units > 0 THEN
    v_occ_rate := ROUND((v_rented_units::numeric / v_total_units) * 100);
  ELSIF v_rented_units > 0 THEN
    v_occ_rate := 100;
  END IF;

  SELECT COUNT(*) INTO v_properties_count FROM properties;
  SELECT COUNT(*) INTO v_active_contracts FROM contracts WHERE status = 'active';
  SELECT COUNT(*) INTO v_beneficiaries_count FROM beneficiaries_safe WHERE (share_percentage IS NOT NULL AND share_percentage > 0);
  SELECT COUNT(*) INTO v_pending_advances FROM advance_requests WHERE status = 'pending' AND (fiscal_year_id = v_fy_id OR fiscal_year_id IS NULL);
  SELECT COUNT(*) INTO v_expiring_contracts FROM contracts
    WHERE status = 'active' AND end_date >= CURRENT_DATE AND end_date <= CURRENT_DATE + INTERVAL '90 days';
  SELECT COUNT(*) INTO v_orphaned_contracts FROM contracts WHERE fiscal_year_id IS NULL;
  SELECT COUNT(*) INTO v_unsubmitted_zatca FROM payment_invoices
    WHERE fiscal_year_id = v_fy_id AND (zatca_status IS NULL OR zatca_status = 'not_submitted');

  SELECT COALESCE(jsonb_agg(row_to_json(m)::jsonb ORDER BY m.month), '[]'::jsonb)
  INTO v_monthly
  FROM (
    SELECT
      to_char(d.month, 'YYYY-MM') AS month,
      COALESCE(i.total, 0) AS income,
      COALESCE(e.total, 0) AS expenses
    FROM (
      SELECT DISTINCT date_trunc('month', date) AS month FROM income WHERE fiscal_year_id = v_fy_id
      UNION
      SELECT DISTINCT date_trunc('month', date) FROM expenses WHERE fiscal_year_id = v_fy_id
    ) d
    LEFT JOIN (
      SELECT date_trunc('month', date) AS month, SUM(amount) AS total
      FROM income WHERE fiscal_year_id = v_fy_id GROUP BY 1
    ) i ON i.month = d.month
    LEFT JOIN (
      SELECT date_trunc('month', date) AS month, SUM(amount) AS total
      FROM expenses WHERE fiscal_year_id = v_fy_id GROUP BY 1
    ) e ON e.month = d.month
  ) m;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', expense_type, 'value', total)), '[]'::jsonb)
  INTO v_expense_types
  FROM (
    SELECT expense_type, SUM(amount) AS total
    FROM expenses WHERE fiscal_year_id = v_fy_id
    GROUP BY expense_type ORDER BY total DESC
  ) t;

  SELECT id, label, (status = 'closed') INTO v_prev_fy_id, v_prev_label, v_prev_is_closed
  FROM fiscal_years
  WHERE start_date < (SELECT start_date FROM fiscal_years WHERE id = v_fy_id)
  ORDER BY start_date DESC LIMIT 1;

  IF v_prev_fy_id IS NOT NULL THEN
    v_has_prev := true;
    SELECT * INTO v_prev_account FROM accounts WHERE fiscal_year_id = v_prev_fy_id LIMIT 1;
    v_has_prev_account := FOUND;

    -- F1: للسنة السابقة المغلقة — نقرأ من snapshot ونتجنّب SUM(income/expenses)
    IF v_prev_is_closed AND v_has_prev_account
       AND v_prev_account.total_income IS NOT NULL
       AND v_prev_account.total_expenses IS NOT NULL THEN
      v_prev_income := v_prev_account.total_income;
      v_prev_expenses := v_prev_account.total_expenses;
    ELSE
      SELECT COALESCE(SUM(amount), 0) INTO v_prev_income FROM income WHERE fiscal_year_id = v_prev_fy_id;
      SELECT COALESCE(SUM(amount), 0) INTO v_prev_expenses FROM expenses WHERE fiscal_year_id = v_prev_fy_id;
    END IF;

    IF v_has_prev_account THEN
      v_prev_corpus_previous := COALESCE(v_prev_account.waqf_corpus_previous, 0);
      v_prev_vat := COALESCE(v_prev_account.vat_amount, 0);
      v_prev_zakat := COALESCE(v_prev_account.zakat_amount, 0);
      v_prev_net_after_zakat := COALESCE(v_prev_account.net_after_vat, 0) - v_prev_zakat;
    ELSE
      v_prev_net_after_zakat := v_prev_income - v_prev_expenses;
    END IF;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'label', label, 'status', status,
    'start_date', start_date, 'end_date', end_date, 'published', published
  ) ORDER BY start_date DESC), '[]'::jsonb)
  INTO v_fiscal_years FROM fiscal_years;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'name', name, 'share_percentage', share_percentage, 'user_id', user_id
  ) ORDER BY name), '[]'::jsonb)
  INTO v_beneficiaries FROM beneficiaries_safe;

  v_totals := jsonb_build_object(
    'total_income', v_total_income,
    'total_expenses', v_total_expenses,
    'net_after_expenses', v_net_after_expenses,
    'contractual_revenue', v_contractual_revenue,
    'grand_total', v_grand_total,
    'vat_amount', v_vat_amount,
    'zakat_amount', v_zakat_amount,
    'net_after_vat', v_net_after_vat,
    'net_after_zakat', v_net_after_zakat,
    'admin_share', v_admin_share,
    'waqif_share', v_waqif_share,
    'waqf_revenue', v_waqf_revenue,
    'waqf_corpus_manual', v_waqf_corpus_manual,
    'waqf_corpus_previous', v_waqf_corpus_previous,
    'distributions_amount', v_distributions_amount,
    'available_amount', v_available_amount,
    'remaining_balance', v_remaining_balance,
    'available_amount_raw', v_available_amount_raw,
    'remaining_balance_raw', v_remaining_balance_raw,
    'share_base', v_share_base
  );

  v_collection := jsonb_build_object(
    'paid_count', v_paid_count,
    'partial_count', v_partial_count,
    'unpaid_count', v_unpaid_count,
    'overdue_count', v_overdue_count,
    'total', v_coll_total,
    'percentage', v_coll_pct,
    'total_collected', v_coll_collected,
    'total_expected', v_coll_expected
  );

  v_occupancy := jsonb_build_object(
    'rented_units', v_rented_units,
    'total_units', v_total_units,
    'rate', v_occ_rate
  );

  v_counts := jsonb_build_object(
    'properties', v_properties_count,
    'active_contracts', v_active_contracts,
    'beneficiaries', v_beneficiaries_count,
    'pending_advances', v_pending_advances,
    'expiring_contracts', v_expiring_contracts,
    'orphaned_contracts', v_orphaned_contracts,
    'unsubmitted_zatca', v_unsubmitted_zatca
  );

  v_yoy := jsonb_build_object(
    'prev_fy_id', v_prev_fy_id,
    'prev_label', v_prev_label,
    'prev_income', v_prev_income,
    'prev_expenses', v_prev_expenses,
    'prev_corpus_previous', v_prev_corpus_previous,
    'prev_vat', v_prev_vat,
    'prev_zakat', v_prev_zakat,
    'prev_net_after_zakat', v_prev_net_after_zakat,
    'prev_has_account', v_has_prev_account,
    'has_prev', v_has_prev
  );

  v_result := jsonb_build_object(
    'fiscal_year', jsonb_build_object('id', v_fy_id, 'label', v_fy_label, 'status', v_fy_status, 'is_closed', v_is_closed),
    'totals', v_totals,
    'collection', v_collection,
    'occupancy', v_occupancy,
    'counts', v_counts,
    'monthly', v_monthly,
    'expense_types', v_expense_types,
    'yoy', v_yoy,
    'fiscal_years', v_fiscal_years,
    'settings', v_dashboard_settings,
    'beneficiaries', v_beneficiaries
  );

  RETURN v_result;
END;
$function$;