CREATE OR REPLACE FUNCTION public.get_multi_year_summary(p_year_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_year_id uuid;
  v_fy RECORD;
  v_entry jsonb;
  v_account RECORD;
  v_total_income numeric;
  v_total_expenses numeric;
  v_expenses_by_type jsonb;
  v_net_after_zakat numeric;
  v_available_amount numeric;
BEGIN
  FOREACH v_year_id IN ARRAY p_year_ids
  LOOP
    SELECT id, label, status INTO v_fy FROM fiscal_years WHERE id = v_year_id;
    IF v_fy.id IS NULL THEN CONTINUE; END IF;

    SELECT COALESCE(SUM(amount), 0) INTO v_total_income FROM income WHERE fiscal_year_id = v_year_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_total_expenses FROM expenses WHERE fiscal_year_id = v_year_id;

    SELECT admin_share, waqif_share, waqf_revenue, vat_amount,
           zakat_amount, net_after_expenses, net_after_vat,
           distributions_amount, waqf_corpus_manual, waqf_corpus_previous
      INTO v_account
      FROM accounts WHERE fiscal_year_id = v_year_id LIMIT 1;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('expense_type', sub.expense_type, 'total', sub.t)), '[]'::jsonb)
      INTO v_expenses_by_type
      FROM (SELECT expense_type, SUM(amount) AS t FROM expenses WHERE fiscal_year_id = v_year_id GROUP BY expense_type) sub;

    -- net_after_zakat = net_after_vat - zakat_amount (مستقر للسنوات المقفلة)
    v_net_after_zakat := COALESCE(v_account.net_after_vat, 0) - COALESCE(v_account.zakat_amount, 0);
    -- available_amount = waqf_revenue - waqf_corpus_manual (قد تكون سالبة → الواجهة تتولى العرض)
    v_available_amount := COALESCE(v_account.waqf_revenue, 0) - COALESCE(v_account.waqf_corpus_manual, 0);

    v_entry := jsonb_build_object(
      'year_id', v_year_id,
      'label', v_fy.label,
      'status', v_fy.status,
      'total_income', v_total_income,
      'total_expenses', v_total_expenses,
      'account', CASE WHEN v_account.waqf_revenue IS NOT NULL THEN jsonb_build_object(
        'vat_amount', COALESCE(v_account.vat_amount, 0),
        'zakat_amount', COALESCE(v_account.zakat_amount, 0),
        'admin_share', COALESCE(v_account.admin_share, 0),
        'waqif_share', COALESCE(v_account.waqif_share, 0),
        'waqf_revenue', COALESCE(v_account.waqf_revenue, 0),
        'net_after_expenses', COALESCE(v_account.net_after_expenses, 0),
        'net_after_vat', COALESCE(v_account.net_after_vat, 0),
        'net_after_zakat', v_net_after_zakat,
        'available_amount', v_available_amount,
        'distributions_amount', COALESCE(v_account.distributions_amount, 0),
        'waqf_corpus_manual', COALESCE(v_account.waqf_corpus_manual, 0),
        'waqf_corpus_previous', COALESCE(v_account.waqf_corpus_previous, 0)
      ) ELSE null END,
      'expenses_by_type', v_expenses_by_type
    );

    v_result := v_result || v_entry;
  END LOOP;

  RETURN v_result;
END;
$function$;