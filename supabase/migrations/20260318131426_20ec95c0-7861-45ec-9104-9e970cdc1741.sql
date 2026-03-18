
-- ============================================================
-- Round 15 Forensic Audit — 6 إصلاحات حرجة
-- ============================================================

-- 1. CRIT-C: إصلاح icv_seq — مزامنة مع MAX(icv) في invoice_chain
SELECT setval('public.icv_seq', GREATEST(
  (SELECT COALESCE(MAX(icv), 0) FROM public.invoice_chain),
  (SELECT last_value FROM public.icv_seq)
), true);

-- 2. REGRESSION-1: إصلاح contracts_safe — إزالة security_invoker
DROP VIEW IF EXISTS public.contracts_safe;
CREATE VIEW public.contracts_safe
WITH (security_barrier = true)
AS SELECT
  c.id,
  c.property_id,
  c.unit_id,
  c.start_date,
  c.end_date,
  c.rent_amount,
  c.payment_count,
  c.payment_amount,
  c.fiscal_year_id,
  c.created_at,
  c.updated_at,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_crn ELSE NULL::text END AS tenant_crn,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_street ELSE NULL::text END AS tenant_street,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_district ELSE NULL::text END AS tenant_district,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_city ELSE NULL::text END AS tenant_city,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_building ELSE NULL::text END AS tenant_building,
  c.payment_type,
  c.status,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.notes ELSE NULL::text END AS notes,
  c.contract_number,
  c.tenant_name,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_id_number ELSE NULL::text END AS tenant_id_number,
  CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN c.tenant_id_type ELSE NULL::text END AS tenant_id_type
FROM public.contracts c
WHERE auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  )
  AND is_fiscal_year_accessible(c.fiscal_year_id);

-- صلاحيات contracts_safe
REVOKE ALL ON public.contracts_safe FROM PUBLIC, anon;
GRANT SELECT ON public.contracts_safe TO authenticated;

-- 3. REGRESSION-2: إصلاح beneficiaries_safe — CASE WHEN للأدمين/المحاسب + المستفيد يرى بياناته
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe
WITH (security_barrier = true)
AS SELECT
  b.id,
  b.name,
  b.share_percentage,
  b.user_id,
  b.created_at,
  b.updated_at,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN b.national_id
    WHEN b.user_id = auth.uid() THEN b.national_id
    ELSE '***'::text
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN b.bank_account
    WHEN b.user_id = auth.uid() THEN b.bank_account
    ELSE '***'::text
  END AS bank_account,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN b.email
    WHEN b.user_id = auth.uid() THEN b.email
    ELSE '***'::text
  END AS email,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN b.phone
    WHEN b.user_id = auth.uid() THEN b.phone
    ELSE '***'::text
  END AS phone,
  CASE
    WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN b.notes
    WHEN b.user_id = auth.uid() THEN b.notes
    ELSE '***'::text
  END AS notes
FROM public.beneficiaries b
WHERE auth.uid() IS NOT NULL
  AND (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR b.user_id = auth.uid()
  );

-- صلاحيات beneficiaries_safe
REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC, anon;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- 4. DB-CRIT-1/2: سحب صلاحيات PII functions بصيغة شاملة
REVOKE ALL ON FUNCTION public.decrypt_pii(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.decrypt_pii(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.decrypt_pii(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(text) TO service_role;

REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM authenticated;
REVOKE ALL ON FUNCTION public.encrypt_pii(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO service_role;

REVOKE ALL ON FUNCTION public.get_pii_key() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pii_key() FROM authenticated;
REVOKE ALL ON FUNCTION public.get_pii_key() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pii_key() TO service_role;

-- 5a. CRIT-B: إصلاح validate_advance_request_amount — إضافة advance_carryforward
CREATE OR REPLACE FUNCTION public.validate_advance_request_amount()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_share_pct numeric;
  v_total_pct numeric;
  v_available_amount numeric;
  v_paid_advances numeric;
  v_max_advance numeric;
  v_estimated_share numeric;
  v_max_percentage numeric;
  v_active_carryforward numeric;
BEGIN
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = NEW.beneficiary_id;

  IF v_share_pct IS NULL THEN
    RAISE EXCEPTION 'المستفيد غير موجود';
  END IF;

  SELECT COALESCE(SUM(share_percentage), 100) INTO v_total_pct FROM beneficiaries;

  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = NEW.fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;

  -- إصلاح CRIT-B: خصم advance_carryforward النشط
  SELECT COALESCE(SUM(amount), 0) INTO v_active_carryforward
  FROM advance_carryforward
  WHERE beneficiary_id = NEW.beneficiary_id AND status = 'active';

  v_estimated_share := GREATEST(0, v_estimated_share - v_active_carryforward);

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = NEW.beneficiary_id
    AND fiscal_year_id = NEW.fiscal_year_id
    AND status = 'paid'
    AND id != NEW.id;

  SELECT COALESCE(value::numeric, 50) INTO v_max_percentage
  FROM app_settings WHERE key = 'advance_max_percentage';
  IF v_max_percentage IS NULL THEN v_max_percentage := 50; END IF;

  v_max_advance := GREATEST(0, (v_estimated_share * v_max_percentage / 100) - v_paid_advances);

  IF NEW.amount > v_max_advance THEN
    RAISE EXCEPTION 'مبلغ السلفة (%) يتجاوز الحد الأقصى المسموح (%) بنسبة %',
      NEW.amount, ROUND(v_max_advance, 2), v_max_percentage || '%%';
  END IF;

  RETURN NEW;
END;
$function$;

-- 5b. HIGH-2: إصلاح close_fiscal_year — إعادة FOR UPDATE
CREATE OR REPLACE FUNCTION public.close_fiscal_year(
  p_fiscal_year_id uuid,
  p_account_data jsonb,
  p_waqf_corpus_manual numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- إصلاح HIGH-2: إعادة FOR UPDATE لمنع race condition
  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id FOR UPDATE;
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

  -- إنشاء سنة مالية تالية تلقائياً
  v_next_start := v_fy.end_date + interval '1 day';
  v_next_end := v_next_start + interval '1 year' - interval '1 day';
  v_next_label := extract(year from v_next_start)::text || '/' || extract(year from v_next_end)::text;

  SELECT id INTO v_existing_next_id FROM fiscal_years
  WHERE start_date = v_next_start;

  IF v_existing_next_id IS NULL THEN
    INSERT INTO fiscal_years (label, start_date, end_date, status, published)
    VALUES (v_next_label, v_next_start, v_next_end, 'active', false);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'warnings', to_jsonb(v_warnings)
  );
END;
$function$;
