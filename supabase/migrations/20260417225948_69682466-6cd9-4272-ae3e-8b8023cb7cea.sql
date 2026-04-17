-- تحديث execute_distribution لإرسال إشعارات تفسير الخصومات للمستفيد
-- يُحافظ على نفس التوقيع والسلوك الحسابي — فقط يضيف notifications إضافية

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
  v_today date := CURRENT_DATE;
  v_remaining numeric;
  v_cf record;
  v_cf_amount numeric;
  v_with_share int := 0;
  v_with_deficit int := 0;
  v_actual_total numeric;
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
  v_total_deductions numeric;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ التوزيع';
  END IF;

  IF p_fiscal_year_id IS NULL THEN
    RAISE EXCEPTION 'معرف السنة المالية مطلوب لتنفيذ التوزيع';
  END IF;

  SELECT * INTO v_account_record FROM accounts WHERE id = p_account_id;
  IF v_account_record.id IS NULL THEN
    RAISE EXCEPTION 'الحساب الختامي غير موجود';
  END IF;

  IF v_account_record.fiscal_year_id != p_fiscal_year_id THEN
    RAISE EXCEPTION 'الحساب الختامي لا ينتمي للسنة المالية المحددة';
  END IF;

  v_available_amount := COALESCE(v_account_record.waqf_revenue, 0) - COALESCE(v_account_record.waqf_corpus_manual, 0);

  IF EXISTS (
    SELECT 1 FROM distributions
    WHERE account_id = p_account_id AND fiscal_year_id = p_fiscal_year_id
  ) THEN
    RAISE EXCEPTION 'تم توزيع حصص هذا الحساب مسبقاً';
  END IF;

  SELECT COALESCE(SUM(share_percentage), 0) INTO v_total_pct FROM beneficiaries;

  IF v_total_pct <= 0 THEN
    RAISE EXCEPTION 'لا يوجد مستفيدون بنسب صالحة';
  END IF;

  FOR dist IN SELECT * FROM jsonb_array_elements(p_distributions)
  LOOP
    v_beneficiary_id := (dist->>'beneficiary_id')::uuid;
    v_beneficiary_name := dist->>'beneficiary_name';
    v_beneficiary_user_id := NULLIF(dist->>'beneficiary_user_id', '')::uuid;

    SELECT id, name, share_percentage, user_id
      INTO v_ben_record
      FROM beneficiaries WHERE id = v_beneficiary_id;

    IF v_ben_record.id IS NULL THEN
      RAISE EXCEPTION 'المستفيد % غير موجود في قاعدة البيانات', v_beneficiary_id;
    END IF;

    v_server_share := ROUND(v_available_amount * v_ben_record.share_percentage / v_total_pct, 2);

    SELECT COALESCE(SUM(amount), 0) INTO v_server_advances
      FROM advance_requests
      WHERE beneficiary_id = v_beneficiary_id
        AND fiscal_year_id = p_fiscal_year_id
        AND status = 'paid';

    SELECT COALESCE(SUM(amount), 0) INTO v_server_carryforward
      FROM advance_carryforward
      WHERE beneficiary_id = v_beneficiary_id
        AND status = 'active';

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

    -- 3. إنشاء ترحيل جديد إذا كان هناك عجز + إشعار العجز
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
          'ترحيل فرق سُلف للسنة القادمة',
          'لم تَكْفِ حصتك لتغطية السُلف والفروق السابقة، فتم ترحيل مبلغ ' || v_server_deficit::text || ' ر.س كفرق إلى السنة المالية القادمة. التفاصيل في صفحة "حصتي من الريع".',
          'warning',
          '/beneficiary/my-share'
        );
      END IF;
    END IF;

    -- جديد: إشعار تفسير الخصومات (سُلف/فروق) حتى لو لم يحصل ترحيل عجز
    -- يُرسل عندما تكون هناك خصومات فعلية (sum > 0) ولم يُرسل إشعار العجز أعلاه
    v_total_deductions := v_server_advances + v_server_carryforward;
    IF v_ben_record.user_id IS NOT NULL AND v_total_deductions > 0 AND v_server_deficit = 0 THEN
      IF v_server_net = 0 THEN
        -- الحالة الحرجة: حصة صفرية بسبب الخصومات
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_ben_record.user_id,
          'حصتك الصافية صفر بعد الخصومات',
          'حصتك من الريع (' || v_server_share::text || ' ر.س) تمت تغطيتها بالكامل بـ' ||
            CASE WHEN v_server_advances > 0 THEN ' سُلف مدفوعة (' || v_server_advances::text || ' ر.س)' ELSE '' END ||
            CASE WHEN v_server_advances > 0 AND v_server_carryforward > 0 THEN ' و' ELSE '' END ||
            CASE WHEN v_server_carryforward > 0 THEN ' فروق مرحَّلة (' || v_server_carryforward::text || ' ر.س)' ELSE '' END ||
            '. لا يوجد مبلغ إضافي للصرف هذه السنة. التفاصيل في "حصتي من الريع".',
          'info',
          '/beneficiary/my-share'
        );
      ELSE
        -- خصم جزئي من الحصة
        INSERT INTO notifications (user_id, title, message, type, link)
        VALUES (
          v_ben_record.user_id,
          'تم خصم سُلف/فروق من حصتك',
          'تم خصم ' || v_total_deductions::text || ' ر.س من حصتك (' || v_server_share::text || ' ر.س) كتسوية للسُلف والفروق. صافي حصتك: ' || v_server_net::text || ' ر.س. التفاصيل في "حصتي من الريع".',
          'info',
          '/beneficiary/my-share'
        );
      END IF;
    END IF;
  END LOOP;

  IF v_sum_distributions > v_available_amount + 0.01 THEN
    RAISE EXCEPTION 'إجمالي التوزيعات (%) يتجاوز المبلغ المتاح (%)', v_sum_distributions, v_available_amount;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_actual_total
    FROM distributions
    WHERE account_id = p_account_id AND fiscal_year_id = p_fiscal_year_id;

  UPDATE accounts SET distributions_amount = v_actual_total WHERE id = p_account_id;

  -- إشعار جماعي عام
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