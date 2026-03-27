
-- ═══════════════════════════════════════════════════════════════════════════════
-- إصلاح شامل: حزمة الإقفال + حزمة السُلف (تناقضات #11, #17, #19-25)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
-- #11 + #24: إصلاح enforce_single_active_fy
-- يمنع إنشاء سنة نشطة إلا من خلال close_fiscal_year (الذي يُقفل أولاً)
-- ───────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_single_active_fy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_count int;
BEGIN
  IF NEW.status = 'active' THEN
    -- عد السنوات النشطة الأخرى (بدون الحالية)
    SELECT count(*) INTO v_existing_count
    FROM fiscal_years
    WHERE status = 'active' AND id != NEW.id;

    IF v_existing_count > 0 THEN
      RAISE EXCEPTION 'لا يمكن وجود أكثر من سنة مالية نشطة. أقفل السنة الحالية أولاً من صفحة الحسابات الختامية.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────────────
-- #17 + #21: إصلاح close_fiscal_year
-- - يمنع الإقفال بأرقام صفرية (total_income = 0)
-- - يوحّد تسمية السنة إلى YYYY-YYYY
-- - يستخدم interval '1 year' بدلاً من +365
-- ───────────────────────────────────────────────────────────────────────────────
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
  v_carried_invoices int;
  v_total_income numeric;
BEGIN
  -- #10: الناظر فقط
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'فقط الناظر يملك صلاحية إقفال السنة المالية';
  END IF;

  SELECT * INTO v_fy FROM fiscal_years WHERE id = p_fiscal_year_id FOR UPDATE;
  IF v_fy IS NULL THEN RAISE EXCEPTION 'السنة المالية غير موجودة'; END IF;
  IF v_fy.status = 'closed' THEN RAISE EXCEPTION 'السنة المالية مقفلة بالفعل'; END IF;

  -- #17: التحقق من أن الحسابات ليست صفرية بالكامل
  v_total_income := COALESCE((p_account_data->>'total_income')::numeric, 0);
  IF v_total_income <= 0 AND COALESCE((p_account_data->>'total_expenses')::numeric, 0) <= 0 THEN
    RAISE EXCEPTION 'لا يمكن إقفال السنة المالية بحسابات ختامية صفرية. يجب حفظ الحسابات الختامية أولاً من صفحة الحسابات.';
  END IF;

  -- تحذيرات
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

  -- إنشاء/تحديث الحساب الختامي
  SELECT id INTO v_account_id FROM accounts WHERE fiscal_year_id = p_fiscal_year_id;

  IF v_account_id IS NULL THEN
    INSERT INTO accounts (
      fiscal_year, fiscal_year_id, total_income, total_expenses, vat_amount, zakat_amount,
      admin_share, waqif_share, net_after_expenses, net_after_vat,
      waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount
    ) VALUES (
      v_fy.label, p_fiscal_year_id,
      v_total_income,
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
      total_income = v_total_income,
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

  -- إقفال السنة
  UPDATE fiscal_years SET status = 'closed' WHERE id = p_fiscal_year_id;

  -- #21: توحيد التسمية إلى YYYY-YYYY مع interval '1 year'
  v_next_start := v_fy.end_date + interval '1 day';
  v_next_end := v_next_start + interval '1 year' - interval '1 day';
  v_next_label := extract(year from v_next_start)::text || '-' || extract(year from v_next_end)::text;

  SELECT id INTO v_existing_next_id FROM fiscal_years
  WHERE start_date = v_next_start;

  IF v_existing_next_id IS NULL THEN
    INSERT INTO fiscal_years (label, start_date, end_date, status, published)
    VALUES (v_next_label, v_next_start, v_next_end, 'active', false)
    RETURNING id INTO v_existing_next_id;
  END IF;

  -- ترحيل الفواتير غير المسددة
  IF v_existing_next_id IS NOT NULL THEN
    UPDATE payment_invoices
    SET fiscal_year_id = v_existing_next_id, updated_at = now()
    WHERE fiscal_year_id = p_fiscal_year_id
      AND status IN ('pending', 'overdue')
      AND (zatca_status IS NULL OR zatca_status = 'not_submitted');

    GET DIAGNOSTICS v_carried_invoices = ROW_COUNT;
    IF v_carried_invoices > 0 THEN
      v_warnings := array_append(v_warnings, 'تم ترحيل ' || v_carried_invoices || ' فاتورة غير مسددة للسنة التالية');
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'account_id', v_account_id,
    'closed_label', v_fy.label,
    'next_label', v_next_label,
    'carried_invoices', COALESCE(v_carried_invoices, 0),
    'warnings', to_jsonb(v_warnings)
  );
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────────────
-- #19 + #20 + #23: إصلاح validate_advance_request_amount
-- - يقرأ max_percentage من advance_settings JSON (موحّد مع UI)
-- - يستخدم NULLIF لمنع القسمة على صفر
-- - يقرأ carryforward مع فلتر متسق
-- ───────────────────────────────────────────────────────────────────────────────
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
  v_advance_settings_json text;
BEGIN
  -- جلب نسبة المستفيد
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = NEW.beneficiary_id;

  IF v_share_pct IS NULL THEN
    RAISE EXCEPTION 'المستفيد غير موجود';
  END IF;

  -- مجموع النسب الفعلي (لا 100 ثابتة)
  SELECT COALESCE(SUM(share_percentage), 0) INTO v_total_pct FROM beneficiaries;
  IF v_total_pct <= 0 THEN
    RAISE EXCEPTION 'لا يوجد مستفيدون بنسب صالحة';
  END IF;

  -- الريع المتاح من الحسابات الختامية
  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = NEW.fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  -- الحصة التقديرية بالتناسب الحقيقي
  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;
  IF v_estimated_share IS NULL THEN v_estimated_share := 0; END IF;

  -- #25: خصم advance_carryforward النشط — بدون فلتر على fiscal_year (تراكمي)
  SELECT COALESCE(SUM(amount), 0) INTO v_active_carryforward
  FROM advance_carryforward
  WHERE beneficiary_id = NEW.beneficiary_id AND status = 'active';

  v_estimated_share := GREATEST(0, v_estimated_share - v_active_carryforward);

  -- السُلف المدفوعة لنفس السنة
  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = NEW.beneficiary_id
    AND fiscal_year_id = NEW.fiscal_year_id
    AND status = 'paid'
    AND id != NEW.id;

  -- #23: قراءة max_percentage من advance_settings JSON (موحّد مع الواجهة)
  SELECT value INTO v_advance_settings_json
  FROM app_settings WHERE key = 'advance_settings';

  IF v_advance_settings_json IS NOT NULL THEN
    v_max_percentage := COALESCE((v_advance_settings_json::jsonb->>'max_percentage')::numeric, 50);
  ELSE
    -- فالباك: قراءة من المفتاح القديم للتوافقية
    SELECT COALESCE(value::numeric, 50) INTO v_max_percentage
    FROM app_settings WHERE key = 'advance_max_percentage';
    IF v_max_percentage IS NULL THEN v_max_percentage := 50; END IF;
  END IF;

  v_max_advance := GREATEST(0, (v_estimated_share * v_max_percentage / 100) - v_paid_advances);

  IF NEW.amount > v_max_advance THEN
    RAISE EXCEPTION 'مبلغ السلفة (%) يتجاوز الحد الأقصى المسموح (%) بنسبة %',
      NEW.amount, ROUND(v_max_advance, 2), v_max_percentage || '%%';
  END IF;

  RETURN NEW;
END;
$function$;

-- ───────────────────────────────────────────────────────────────────────────────
-- #23 + #25: إصلاح get_max_advance_amount بنفس المنطق
-- ───────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_max_advance_amount(
  p_beneficiary_id uuid,
  p_fiscal_year_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  v_advance_settings_json text;
BEGIN
  -- جلب نسبة المستفيد
  SELECT share_percentage INTO v_share_pct
  FROM beneficiaries WHERE id = p_beneficiary_id;

  IF v_share_pct IS NULL THEN
    RETURN jsonb_build_object('error', 'المستفيد غير موجود');
  END IF;

  -- مجموع النسب الفعلي
  SELECT COALESCE(SUM(share_percentage), 0) INTO v_total_pct FROM beneficiaries;
  IF v_total_pct <= 0 THEN
    RETURN jsonb_build_object('error', 'لا يوجد مستفيدون بنسب صالحة');
  END IF;

  -- الريع المتاح
  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts
  WHERE fiscal_year_id = p_fiscal_year_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  -- الحصة التقديرية
  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;

  -- المرحّلات النشطة (تراكمي — بدون فلتر سنة)
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

  -- #23: قراءة max_percentage من advance_settings JSON (موحّد مع الواجهة)
  SELECT value INTO v_advance_settings_json
  FROM app_settings WHERE key = 'advance_settings';

  IF v_advance_settings_json IS NOT NULL THEN
    v_max_percentage := COALESCE((v_advance_settings_json::jsonb->>'max_percentage')::numeric, 50);
  ELSE
    SELECT COALESCE(value::numeric, 50) INTO v_max_percentage
    FROM app_settings WHERE key = 'advance_max_percentage';
    IF v_max_percentage IS NULL THEN v_max_percentage := 50; END IF;
  END IF;

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
$function$;
