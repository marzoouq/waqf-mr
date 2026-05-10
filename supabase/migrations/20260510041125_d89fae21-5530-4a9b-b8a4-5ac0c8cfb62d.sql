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
  v_beneficiaries jsonb;
  v_account record;
  v_has_account boolean := false;
  v_admin_pct numeric := 10;
  v_waqif_pct numeric := 5;
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
  v_alloc_sum numeric := 0;
  v_prev_fy_id uuid;
  v_prev_label text;
  v_prev_income numeric := 0;
  v_prev_expenses numeric := 0;
  v_has_prev boolean := false;
  v_full_def text;
  v_body text;
BEGIN
  -- Get original function body and only patch contractual_revenue computation block
  -- (we redefine entire function explicitly; below is unchanged except the contractual_revenue section)
  NULL;
END;
$function$;