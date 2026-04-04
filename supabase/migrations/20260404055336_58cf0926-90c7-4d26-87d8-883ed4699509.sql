
CREATE OR REPLACE FUNCTION public.get_year_comparison_summary(
  p_year1_id uuid,
  p_year2_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_year1 jsonb;
  v_year2 jsonb;
BEGIN
  -- بناء ملخص سنة واحدة
  -- السنة الأولى
  SELECT jsonb_build_object(
    'total_income', COALESCE((SELECT SUM(amount) FROM income WHERE fiscal_year_id = p_year1_id), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM expenses WHERE fiscal_year_id = p_year1_id), 0),
    'account', (
      SELECT jsonb_build_object(
        'vat_amount', COALESCE(a.vat_amount, 0),
        'zakat_amount', COALESCE(a.zakat_amount, 0),
        'admin_share', COALESCE(a.admin_share, 0),
        'waqif_share', COALESCE(a.waqif_share, 0),
        'waqf_revenue', COALESCE(a.waqf_revenue, 0),
        'distributions_amount', COALESCE(a.distributions_amount, 0),
        'net_after_expenses', COALESCE(a.net_after_expenses, 0),
        'net_after_vat', COALESCE(a.net_after_vat, 0)
      )
      FROM accounts a WHERE a.fiscal_year_id = p_year1_id LIMIT 1
    ),
    'monthly_income', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', m, 'total', t) ORDER BY m)
      FROM (SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t FROM income WHERE fiscal_year_id = p_year1_id GROUP BY 1) sub
    ), '[]'::jsonb),
    'monthly_expenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', m, 'total', t) ORDER BY m)
      FROM (SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t FROM expenses WHERE fiscal_year_id = p_year1_id GROUP BY 1) sub
    ), '[]'::jsonb),
    'expenses_by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('expense_type', expense_type, 'total', t))
      FROM (SELECT expense_type, SUM(amount) AS t FROM expenses WHERE fiscal_year_id = p_year1_id GROUP BY expense_type) sub
    ), '[]'::jsonb)
  ) INTO v_year1;

  -- السنة الثانية
  SELECT jsonb_build_object(
    'total_income', COALESCE((SELECT SUM(amount) FROM income WHERE fiscal_year_id = p_year2_id), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM expenses WHERE fiscal_year_id = p_year2_id), 0),
    'account', (
      SELECT jsonb_build_object(
        'vat_amount', COALESCE(a.vat_amount, 0),
        'zakat_amount', COALESCE(a.zakat_amount, 0),
        'admin_share', COALESCE(a.admin_share, 0),
        'waqif_share', COALESCE(a.waqif_share, 0),
        'waqf_revenue', COALESCE(a.waqf_revenue, 0),
        'distributions_amount', COALESCE(a.distributions_amount, 0),
        'net_after_expenses', COALESCE(a.net_after_expenses, 0),
        'net_after_vat', COALESCE(a.net_after_vat, 0)
      )
      FROM accounts a WHERE a.fiscal_year_id = p_year2_id LIMIT 1
    ),
    'monthly_income', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', m, 'total', t) ORDER BY m)
      FROM (SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t FROM income WHERE fiscal_year_id = p_year2_id GROUP BY 1) sub
    ), '[]'::jsonb),
    'monthly_expenses', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('month', m, 'total', t) ORDER BY m)
      FROM (SELECT EXTRACT(MONTH FROM date)::int AS m, SUM(amount) AS t FROM expenses WHERE fiscal_year_id = p_year2_id GROUP BY 1) sub
    ), '[]'::jsonb),
    'expenses_by_type', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('expense_type', expense_type, 'total', t))
      FROM (SELECT expense_type, SUM(amount) AS t FROM expenses WHERE fiscal_year_id = p_year2_id GROUP BY expense_type) sub
    ), '[]'::jsonb)
  ) INTO v_year2;

  RETURN jsonb_build_object('year1', v_year1, 'year2', v_year2);
END;
$function$;
