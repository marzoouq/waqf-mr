
-- =============================================
-- إصلاح #10: close_fiscal_year — admin فقط
-- إصلاح #11: enforce_single_active_fy — حماية من الإقفال الصامت
-- إصلاح #13: توحيد فاصل التسمية من '/' إلى '-'
-- إصلاح #12: get_beneficiary_dashboard من STABLE إلى VOLATILE
-- إصلاح #18: إضافة fiscal_year_id في recent_distributions
-- =============================================

-- ========== #10 + #13: إصلاح close_fiscal_year ==========
CREATE OR REPLACE FUNCTION public.close_fiscal_year(
  p_fiscal_year_id uuid,
  p_account_data jsonb,
  p_waqf_corpus_manual numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy RECORD; v_account_id uuid;
  v_next_start date; v_next_end date; v_next_label text;
  v_existing_next_id uuid;
  v_warnings text[] := '{}';
  v_pending_distributions int; v_pending_advances int;
  v_carried_invoices int;
BEGIN
  -- #10: الناظر فقط — المحاسب لا يملك صلاحية الإقفال
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'فقط الناظر يملك صلاحية إقفال السنة المالية';
  END IF;

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

  -- #13: توحيد الفاصل إلى '-' بدلاً من '/'
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
    'carried_invoices', COALESCE(v_carried_invoices, 0),
    'warnings', to_jsonb(v_warnings)
  );
END;
$$;

-- ========== #11: حماية enforce_single_active_fy ==========
-- بدلاً من إقفال صامت: نرفض العملية ونطلب من المستخدم إقفال السنة الحالية أولاً
CREATE OR REPLACE FUNCTION public.enforce_single_active_fy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_active_label text;
BEGIN
  IF NEW.status = 'active' THEN
    -- التحقق من وجود سنة نشطة أخرى
    SELECT label INTO v_existing_active_label
    FROM fiscal_years
    WHERE status = 'active' AND id != NEW.id
    LIMIT 1;

    IF v_existing_active_label IS NOT NULL THEN
      -- إذا كان الاستدعاء من close_fiscal_year (الذي يُقفل السنة الحالية أولاً ثم يُنشئ الجديدة)
      -- نسمح لأن السنة السابقة ستكون مقفلة في نفس التراكنزاكشن
      -- نتحقق مجدداً بعد أن يكون close_fiscal_year قد نفّذ UPDATE status='closed'
      PERFORM 1 FROM fiscal_years
      WHERE status = 'active' AND id != NEW.id;

      IF FOUND THEN
        RAISE EXCEPTION 'لا يمكن وجود أكثر من سنة مالية نشطة. السنة "%" نشطة حالياً — أقفلها أولاً من صفحة الحسابات الختامية.', v_existing_active_label;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ========== #12 + #18: إصلاح get_beneficiary_dashboard ==========
CREATE OR REPLACE FUNCTION public.get_beneficiary_dashboard(
  p_fiscal_year_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
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

  -- 4) بيانات مالية
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

    IF v_fy.status = 'closed' AND v_account.waqf_revenue IS NOT NULL THEN
      v_available_amount := COALESCE(v_account.waqf_revenue, 0) - COALESCE(v_account.waqf_corpus_manual, 0);
      IF v_total_pct > 0 THEN
        v_my_share := ROUND(v_available_amount * COALESCE(v_ben.share_percentage, 0) / v_total_pct, 2);
      END IF;
    END IF;
  END IF;

  -- 5) آخر 3 توزيعات — #18: إضافة fiscal_year_id و fiscal_year label
  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb), '[]'::jsonb)
    INTO v_distributions
    FROM (
      SELECT d.id, d.amount, d.date, d.status, d.fiscal_year_id,
             fy.label AS fiscal_year_label
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
