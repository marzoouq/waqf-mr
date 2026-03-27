
-- =============================================
-- تحصين execute_distribution: إعادة حساب الأرقام من الخادم (#28)
-- التحقق من وجود المستفيد (#29)
-- إصلاح reopen_fiscal_year لمنع إقفال السنة النشطة (#30)
-- تقييد prevent_closed_fy للأدمن فقط (#35)
-- إضافة audit trigger لـ advance_carryforward (#32)
-- =============================================

-- ========== #28 + #29: تحصين execute_distribution ==========
CREATE OR REPLACE FUNCTION public.execute_distribution(
  p_account_id uuid,
  p_distributions jsonb DEFAULT '[]'::jsonb,
  p_fiscal_year_id uuid DEFAULT NULL,
  p_total_distributed numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dist jsonb;
  v_beneficiary_id uuid;
  v_beneficiary_name text;
  v_beneficiary_user_id uuid;
  v_share_amount numeric;
  v_advances_paid numeric;
  v_carryforward_deducted numeric;
  v_net_amount numeric;
  v_deficit numeric;
  v_today date := CURRENT_DATE;
  v_remaining numeric;
  v_cf record;
  v_cf_amount numeric;
  v_with_share int := 0;
  v_with_deficit int := 0;
  v_actual_total numeric;
  -- #28: متغيرات التحقق من الخادم
  v_account_record RECORD;
  v_available_amount numeric;
  v_total_pct numeric;
  v_ben_record RECORD;
  v_server_share numeric;
  v_server_advances numeric;
  v_server_carryforward numeric;
  v_server_net numeric;
  v_server_deficit numeric;
  v_sum_distributions numeric := 0;
BEGIN
  -- التحقق من الصلاحية
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ التوزيع';
  END IF;

  IF p_fiscal_year_id IS NULL THEN
    RAISE EXCEPTION 'معرف السنة المالية مطلوب لتنفيذ التوزيع';
  END IF;

  -- #28: جلب الحساب الختامي والتحقق من المبلغ المتاح
  SELECT * INTO v_account_record FROM accounts WHERE id = p_account_id;
  IF v_account_record.id IS NULL THEN
    RAISE EXCEPTION 'الحساب الختامي غير موجود';
  END IF;

  -- التحقق من أن الحساب ينتمي للسنة المالية المحددة
  IF v_account_record.fiscal_year_id != p_fiscal_year_id THEN
    RAISE EXCEPTION 'الحساب الختامي لا ينتمي للسنة المالية المحددة';
  END IF;

  v_available_amount := COALESCE(v_account_record.waqf_revenue, 0) - COALESCE(v_account_record.waqf_corpus_manual, 0);

  -- حارس التكرار
  IF EXISTS (
    SELECT 1 FROM distributions
    WHERE account_id = p_account_id AND fiscal_year_id = p_fiscal_year_id
  ) THEN
    RAISE EXCEPTION 'تم توزيع حصص هذا الحساب مسبقاً';
  END IF;

  -- #28: جلب إجمالي نسب المستفيدين من الخادم
  SELECT COALESCE(SUM(share_percentage), 0) INTO v_total_pct FROM beneficiaries;

  IF v_total_pct <= 0 THEN
    RAISE EXCEPTION 'لا يوجد مستفيدون بنسب صالحة';
  END IF;

  FOR dist IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_beneficiary_id := (dist->>'beneficiary_id')::uuid;
    v_beneficiary_name := dist->>'beneficiary_name';
    v_beneficiary_user_id := NULLIF(dist->>'beneficiary_user_id', '')::uuid;

    -- #29: التحقق من وجود المستفيد في قاعدة البيانات
    SELECT id, name, share_percentage, user_id
      INTO v_ben_record
      FROM beneficiaries WHERE id = v_beneficiary_id;

    IF v_ben_record.id IS NULL THEN
      RAISE EXCEPTION 'المستفيد % غير موجود في قاعدة البيانات', v_beneficiary_id;
    END IF;

    -- #28: إعادة حساب الحصة من الخادم بدلاً من الثقة بالعميل
    v_server_share := ROUND(v_available_amount * v_ben_record.share_percentage / v_total_pct, 2);

    -- حساب السُلف المدفوعة من الخادم
    SELECT COALESCE(SUM(amount), 0) INTO v_server_advances
      FROM advance_requests
      WHERE beneficiary_id = v_beneficiary_id
        AND fiscal_year_id = p_fiscal_year_id
        AND status = 'paid';

    -- حساب الفروق المرحّلة النشطة من الخادم
    SELECT COALESCE(SUM(amount), 0) INTO v_server_carryforward
      FROM advance_carryforward
      WHERE beneficiary_id = v_beneficiary_id
        AND status = 'active';

    -- حساب المبلغ الصافي من الخادم
    v_server_net := v_server_share - v_server_advances - v_server_carryforward;
    v_server_deficit := 0;

    IF v_server_net < 0 THEN
      v_server_deficit := ABS(v_server_net);
      v_server_net := 0;
    END IF;

    v_sum_distributions := v_sum_distributions + v_server_net;

    -- 1. إنشاء سجل التوزيع بالمبلغ المحسوب من الخادم
    IF v_server_net > 0 THEN
      INSERT INTO distributions (beneficiary_id, account_id, amount, status, date, fiscal_year_id)
      VALUES (v_beneficiary_id, p_account_id, v_server_net, 'pending', v_today, p_fiscal_year_id);
      v_with_share := v_with_share + 1;
    END IF;

    -- 2. تسوية الفروق المرحّلة
    IF v_server_carryforward > 0 THEN
      v_remaining := LEAST(v_server_carryforward, v_server_share - v_server_advances);
      IF v_remaining > 0 THEN
        FOR v_cf IN
          SELECT id, amount FROM advance_carryforward
          WHERE beneficiary_id = v_beneficiary_id AND status = 'active'
          ORDER BY created_at ASC
          FOR UPDATE
        LOOP
          EXIT WHEN v_remaining <= 0;
          v_cf_amount := v_cf.amount;
          IF v_cf_amount <= v_remaining THEN
            UPDATE advance_carryforward SET status = 'settled' WHERE id = v_cf.id;
            v_remaining := v_remaining - v_cf_amount;
          ELSE
            UPDATE advance_carryforward SET amount = v_cf_amount - v_remaining WHERE id = v_cf.id;
            v_remaining := 0;
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- 3. إنشاء ترحيل جديد إذا كان هناك عجز
    IF v_server_deficit > 0 THEN
      INSERT INTO advance_carryforward (beneficiary_id, from_fiscal_year_id, amount, status, notes)
      VALUES (
        v_beneficiary_id, p_fiscal_year_id, v_server_deficit, 'active',
        'ترحيل فرق سُلف من السنة المالية - ' || v_ben_record.name
      );
      v_with_deficit := v_with_deficit + 1;

      IF v_ben_record.user_id IS NOT NULL THEN
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_ben_record.user_id,
          'ترحيل فرق سُلف',
          'تم ترحيل مبلغ ' || v_server_deficit::text || ' ر.س كفرق سُلف للسنة المالية القادمة',
          'warning',
          '/beneficiary/my-share'
        );
      END IF;
    END IF;
  END LOOP;

  -- #28: التحقق من أن إجمالي التوزيعات لا يتجاوز المتاح
  IF v_sum_distributions > v_available_amount + 0.01 THEN
    RAISE EXCEPTION 'إجمالي التوزيعات (%) يتجاوز المبلغ المتاح (%)', v_sum_distributions, v_available_amount;
  END IF;

  -- 4. تحديث مبلغ التوزيعات في الحساب
  SELECT COALESCE(SUM(amount), 0) INTO v_actual_total
    FROM distributions
    WHERE account_id = p_account_id AND fiscal_year_id = p_fiscal_year_id;

  UPDATE accounts SET distributions_amount = v_actual_total WHERE id = p_account_id;

  -- 5. إشعار المستفيدين
  BEGIN
    PERFORM notify_all_beneficiaries(
      'تم توزيع الحصص',
      'تم توزيع حصص الريع بإجمالي ' || v_actual_total::text || ' ر.س. يرجى مراجعة صفحة "حصتي من الريع".',
      'success',
      '/beneficiary/my-share'
    );
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'with_share', v_with_share,
    'with_deficit', v_with_deficit,
    'actual_total', v_actual_total
  );
END;
$$;

-- ========== #30: إصلاح reopen_fiscal_year ==========
CREATE OR REPLACE FUNCTION public.reopen_fiscal_year(
  p_fiscal_year_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_label text;
  v_status text;
  v_active_fy_id uuid;
  v_active_fy_label text;
BEGIN
  -- الناظر فقط
  IF NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإعادة فتح السنة المالية';
  END IF;

  SELECT label, status INTO v_label, v_status
    FROM fiscal_years WHERE id = p_fiscal_year_id;

  IF v_label IS NULL THEN
    RAISE EXCEPTION 'السنة المالية غير موجودة';
  END IF;
  IF v_status != 'closed' THEN
    RAISE EXCEPTION 'السنة المالية ليست مقفلة';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'سبب إعادة الفتح مطلوب';
  END IF;

  -- #30: التحقق من وجود سنة نشطة — منع إعادة الفتح إذا وُجدت
  SELECT id, label INTO v_active_fy_id, v_active_fy_label
    FROM fiscal_years
    WHERE status = 'active' AND id != p_fiscal_year_id
    LIMIT 1;

  IF v_active_fy_id IS NOT NULL THEN
    RAISE EXCEPTION 'لا يمكن إعادة فتح السنة المالية لأن السنة "%" نشطة حالياً. يجب إقفالها أولاً.', v_active_fy_label;
  END IF;

  UPDATE fiscal_years SET status = 'active' WHERE id = p_fiscal_year_id;

  INSERT INTO audit_log (table_name, operation, record_id, old_data, new_data, user_id)
  VALUES (
    'fiscal_years', 'REOPEN', p_fiscal_year_id,
    jsonb_build_object('status', 'closed'),
    jsonb_build_object('status', 'active', 'reason', p_reason),
    auth.uid()
  );

  RETURN jsonb_build_object('label', v_label);
END;
$$;

-- ========== #35: تقييد prevent_closed_fy للأدمن فقط ==========
CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  fy_status text;
  fy_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    fy_id := OLD.fiscal_year_id;
  ELSE
    fy_id := NEW.fiscal_year_id;
  END IF;

  IF fy_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT status INTO fy_status FROM fiscal_years WHERE id = fy_id;

  -- #35: الناظر (admin) فقط يمكنه التعديل في سنة مقفلة
  IF fy_status = 'closed' AND NOT has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'لا يمكن تعديل بيانات سنة مالية مقفلة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ========== #32: audit trigger لـ advance_carryforward ==========
CREATE TRIGGER audit_advance_carryforward
  AFTER INSERT OR UPDATE OR DELETE ON public.advance_carryforward
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
