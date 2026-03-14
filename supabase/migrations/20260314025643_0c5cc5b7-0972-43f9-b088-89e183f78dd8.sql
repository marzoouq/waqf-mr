
-- ============================================================
-- Round 5 Fixes: CRIT-13, HIGH-24, HIGH-22, HIGH-23
-- ============================================================

-- 1a. RLS: Allow all authenticated to SELECT beneficiaries (PII is encrypted)
DROP POLICY IF EXISTS "All authenticated can view beneficiary names" ON public.beneficiaries;
CREATE POLICY "All authenticated can view beneficiary names"
  ON public.beneficiaries FOR SELECT TO authenticated USING (true);

-- 1b. RLS: Allow beneficiary/waqif to SELECT contracts (RESTRICTIVE policy enforces fiscal year)
DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;
CREATE POLICY "Authorized roles can view contracts"
  ON public.contracts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') OR
    has_role(auth.uid(), 'beneficiary') OR has_role(auth.uid(), 'waqif')
  );

-- 1c. DROP and recreate contracts_safe (column order changed)
DROP VIEW IF EXISTS public.contracts_safe CASCADE;
CREATE VIEW public.contracts_safe
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  c.id, c.property_id, c.unit_id, c.start_date, c.end_date,
  c.rent_amount, c.payment_count, c.payment_amount, c.fiscal_year_id,
  c.created_at, c.updated_at,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_tax_number ELSE NULL END AS tenant_tax_number,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_crn ELSE NULL END AS tenant_crn,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_street ELSE NULL END AS tenant_street,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_district ELSE NULL END AS tenant_district,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_city ELSE NULL END AS tenant_city,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_postal_code ELSE NULL END AS tenant_postal_code,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_building ELSE NULL END AS tenant_building,
  c.payment_type, c.status, c.notes, c.contract_number, c.tenant_name,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_id_number ELSE NULL END AS tenant_id_number,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN c.tenant_id_type ELSE NULL END AS tenant_id_type
FROM public.contracts c;

GRANT SELECT ON public.contracts_safe TO authenticated;
REVOKE ALL ON public.contracts_safe FROM anon;

-- 1d. DROP and recreate beneficiaries_safe
DROP VIEW IF EXISTS public.beneficiaries_safe CASCADE;
CREATE VIEW public.beneficiaries_safe
WITH (security_barrier = true, security_invoker = true)
AS
SELECT
  b.id, b.name, b.share_percentage, b.user_id, b.created_at, b.updated_at,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN b.national_id ELSE '********' END AS national_id,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN b.bank_account ELSE '********' END AS bank_account,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN b.email ELSE '********' END AS email,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN b.phone ELSE '********' END AS phone,
  CASE WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') THEN b.notes ELSE NULL END AS notes
FROM public.beneficiaries b;

GRANT SELECT ON public.beneficiaries_safe TO authenticated;
REVOKE ALL ON public.beneficiaries_safe FROM anon;

-- ============================================================
-- 2. HIGH-22: Trigger on INSERT OR UPDATE
-- ============================================================
DROP TRIGGER IF EXISTS validate_advance_request_amount_trigger ON public.advance_requests;
CREATE TRIGGER validate_advance_request_amount_trigger
  BEFORE INSERT OR UPDATE ON public.advance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_advance_request_amount();

-- ============================================================
-- 3. HIGH-23: close_fiscal_year with overlap check
-- ============================================================
CREATE OR REPLACE FUNCTION public.close_fiscal_year(
  p_fiscal_year_id uuid, p_account_data jsonb, p_waqf_corpus_manual numeric DEFAULT 0
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_fy RECORD; v_account_id uuid;
  v_next_start date; v_next_end date; v_next_label text;
  v_existing_next_id uuid;
  v_warnings text[] := '{}';
  v_pending_distributions int; v_pending_advances int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بإقفال السنة المالية';
  END IF;

  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'السنة المالية غير موجودة'; END IF;
  IF v_fy.status = 'closed' THEN RAISE EXCEPTION 'السنة المالية مقفلة بالفعل'; END IF;

  SELECT count(*) INTO v_pending_distributions
  FROM distributions WHERE fiscal_year_id = p_fiscal_year_id AND status = 'pending';
  IF v_pending_distributions > 0 THEN
    v_warnings := array_append(v_warnings, 'يوجد ' || v_pending_distributions || ' توزيع بحالة معلقة');
  END IF;

  SELECT count(*) INTO v_pending_advances
  FROM advance_requests WHERE fiscal_year_id = p_fiscal_year_id AND status IN ('pending', 'approved');
  IF v_pending_advances > 0 THEN
    v_warnings := array_append(v_warnings, 'يوجد ' || v_pending_advances || ' طلب سلفة بحالة معلقة أو موافق عليها');
  END IF;

  SELECT id INTO v_account_id FROM accounts WHERE fiscal_year_id = p_fiscal_year_id;

  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      fiscal_year, fiscal_year_id, total_income, total_expenses, vat_amount, zakat_amount,
      admin_share, waqif_share, net_after_expenses, net_after_vat,
      waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount
    ) VALUES (
      v_fy.label, p_fiscal_year_id,
      COALESCE((p_account_data->>'total_income')::numeric, 0),
      COALESCE((p_account_data->>'total_expenses')::numeric, 0),
      COALESCE((p_account_data->>'vat_amount')::numeric, 0),
      COALESCE((p_account_data->>'zakat_amount')::numeric, 0),
      COALESCE((p_account_data->>'admin_share')::numeric, 0),
      COALESCE((p_account_data->>'waqif_share')::numeric, 0),
      COALESCE((p_account_data->>'net_after_expenses')::numeric, 0),
      COALESCE((p_account_data->>'net_after_vat')::numeric, 0),
      COALESCE((p_account_data->>'waqf_revenue')::numeric, 0),
      p_waqf_corpus_manual,
      COALESCE((p_account_data->>'waqf_corpus_previous')::numeric, 0),
      COALESCE((p_account_data->>'distributions_amount')::numeric, 0)
    ) RETURNING id INTO v_account_id;
  ELSE
    UPDATE accounts SET
      total_income = COALESCE((p_account_data->>'total_income')::numeric, 0),
      total_expenses = COALESCE((p_account_data->>'total_expenses')::numeric, 0),
      vat_amount = COALESCE((p_account_data->>'vat_amount')::numeric, 0),
      zakat_amount = COALESCE((p_account_data->>'zakat_amount')::numeric, 0),
      admin_share = COALESCE((p_account_data->>'admin_share')::numeric, 0),
      waqif_share = COALESCE((p_account_data->>'waqif_share')::numeric, 0),
      net_after_expenses = COALESCE((p_account_data->>'net_after_expenses')::numeric, 0),
      net_after_vat = COALESCE((p_account_data->>'net_after_vat')::numeric, 0),
      waqf_revenue = COALESCE((p_account_data->>'waqf_revenue')::numeric, 0),
      waqf_corpus_manual = p_waqf_corpus_manual,
      waqf_corpus_previous = COALESCE((p_account_data->>'waqf_corpus_previous')::numeric, 0),
      distributions_amount = COALESCE((p_account_data->>'distributions_amount')::numeric, 0),
      updated_at = now()
    WHERE id = v_account_id;
  END IF;

  UPDATE fiscal_years SET status = 'closed' WHERE id = p_fiscal_year_id;

  v_next_start := v_fy.end_date + 1;
  v_next_end := v_fy.end_date + 365;
  v_next_label := 'السنة المالية ' || EXTRACT(YEAR FROM v_next_start)::text || '-' || EXTRACT(YEAR FROM v_next_end)::text;

  SELECT id INTO v_existing_next_id FROM fiscal_years WHERE start_date = v_next_start LIMIT 1;

  IF v_existing_next_id IS NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM fiscal_years
      WHERE id != p_fiscal_year_id AND start_date <= v_next_end AND end_date >= v_next_start
    ) THEN
      INSERT INTO fiscal_years (label, start_date, end_date, status)
      VALUES (v_next_label, v_next_start, v_next_end, 'active');
    ELSE
      v_warnings := array_append(v_warnings, 'لم تُنشأ سنة مالية جديدة بسبب تداخل مع سنة موجودة');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true, 'account_id', v_account_id, 'label', v_fy.label,
    'warnings', to_jsonb(v_warnings)
  );
END;
$$;
