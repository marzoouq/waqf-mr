
-- ─────────────────────────────────────────────────────────────
-- R2.1 — Compound indexes (W6-019/020 + W7-PERF)
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_invoices_contract_due
  ON public.payment_invoices (contract_id, due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_status_date
  ON public.invoices (status, date DESC);

-- ─────────────────────────────────────────────────────────────
-- R2.2 — Helper: assert_fiscal_year_open (W6-015)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assert_fiscal_year_open(p_fiscal_year_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_status text;
BEGIN
  IF p_fiscal_year_id IS NULL THEN
    RAISE EXCEPTION 'معرف السنة المالية مطلوب';
  END IF;
  SELECT status INTO v_status FROM public.fiscal_years WHERE id = p_fiscal_year_id;
  IF v_status IS NULL THEN
    RAISE EXCEPTION 'السنة المالية غير موجودة';
  END IF;
  -- الناظر فقط يستطيع التعديل على السنوات المقفلة (Core rule)
  IF v_status = 'closed' AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'لا يمكن التعديل على سنة مالية مُقفَلة إلا للناظر';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_fiscal_year_open(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_fiscal_year_open(uuid) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- R2.3 — update_advance_status RPC (W7-010)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_advance_status(
  p_id uuid,
  p_status text,
  p_rejection_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.advance_requests%ROWTYPE;
  v_allowed_from text[];
  v_updates jsonb := '{}'::jsonb;
BEGIN
  -- صلاحية: ناظر أو محاسب فقط
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role)
       OR public.has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'غير مصرح بتغيير حالة طلب السلفة';
  END IF;

  SELECT * INTO v_row FROM public.advance_requests WHERE id = p_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'طلب السلفة غير موجود';
  END IF;

  -- حارس السنة المفتوحة
  PERFORM public.assert_fiscal_year_open(v_row.fiscal_year_id);

  -- تحوّلات صالحة
  IF p_status = 'approved' THEN
    v_allowed_from := ARRAY['pending'];
  ELSIF p_status = 'rejected' THEN
    v_allowed_from := ARRAY['pending'];
    IF p_rejection_reason IS NULL OR length(trim(p_rejection_reason)) = 0 THEN
      RAISE EXCEPTION 'سبب الرفض مطلوب';
    END IF;
  ELSIF p_status = 'paid' THEN
    v_allowed_from := ARRAY['approved'];
  ELSE
    RAISE EXCEPTION 'حالة غير صالحة: %', p_status;
  END IF;

  IF NOT (v_row.status = ANY(v_allowed_from)) THEN
    RAISE EXCEPTION 'لا يمكن الانتقال من % إلى %', v_row.status, p_status;
  END IF;

  UPDATE public.advance_requests
  SET
    status = p_status,
    rejection_reason = CASE WHEN p_status = 'rejected' THEN p_rejection_reason ELSE rejection_reason END,
    approved_by = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE approved_by END,
    approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE approved_at END,
    paid_at = CASE WHEN p_status = 'paid' THEN now() ELSE paid_at END
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'id', p_id, 'status', p_status);
END;
$$;

REVOKE ALL ON FUNCTION public.update_advance_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_advance_status(uuid, text, text) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- R2.4 — set_annual_report_publish RPC (W7-015)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_annual_report_publish(
  p_fiscal_year_id uuid,
  p_publish boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_new_status text; v_published_at timestamptz;
BEGIN
  -- الناظر فقط
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'النشر مقصور على ناظر الوقف';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.fiscal_years WHERE id = p_fiscal_year_id) THEN
    RAISE EXCEPTION 'السنة المالية غير موجودة';
  END IF;

  v_new_status := CASE WHEN p_publish THEN 'published' ELSE 'draft' END;
  v_published_at := CASE WHEN p_publish THEN now() ELSE NULL END;

  INSERT INTO public.annual_report_status (fiscal_year_id, status, published_at)
  VALUES (p_fiscal_year_id, v_new_status, v_published_at)
  ON CONFLICT (fiscal_year_id) DO UPDATE
    SET status = EXCLUDED.status,
        published_at = EXCLUDED.published_at;

  RETURN jsonb_build_object('success', true, 'fiscal_year_id', p_fiscal_year_id, 'status', v_new_status);
END;
$$;

REVOKE ALL ON FUNCTION public.set_annual_report_publish(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_annual_report_publish(uuid, boolean) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- R2.5 — Drop legacy execute_distribution overload (W6-016 cleanup)
-- النسخة المُحتفظ بها: (p_account_id, p_distributions, p_fiscal_year_id, p_total_distributed)
-- ─────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.execute_distribution(uuid, uuid, numeric, jsonb);

-- ─────────────────────────────────────────────────────────────
-- R2.6 — Add fiscal-year-open guard inside surviving execute_distribution
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.execute_distribution(
  p_account_id uuid,
  p_distributions jsonb DEFAULT '[]'::jsonb,
  p_fiscal_year_id uuid DEFAULT NULL::uuid,
  p_total_distributed numeric DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
  IF NOT has_role(auth.uid(), 'admin'::app_role) AND NOT has_role(auth.uid(), 'accountant'::app_role) THEN
    RAISE EXCEPTION 'غير مصرح بتنفيذ التوزيع';
  END IF;

  IF p_fiscal_year_id IS NULL THEN
    RAISE EXCEPTION 'معرف السنة المالية مطلوب لتنفيذ التوزيع';
  END IF;

  -- R2: حارس السنة المفتوحة (المحاسب لا يستطيع التنفيذ على سنة مقفلة)
  PERFORM public.assert_fiscal_year_open(p_fiscal_year_id);

  SELECT * INTO v_account_record FROM accounts WHERE id = p_account_id FOR UPDATE;
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

    IF v_server_net > 0 THEN
      INSERT INTO distributions (beneficiary_id, account_id, amount, status, date, fiscal_year_id)
      VALUES (v_beneficiary_id, p_account_id, v_server_net, 'pending', v_today, p_fiscal_year_id);
      v_with_share := v_with_share + 1;
    END IF;

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

    v_total_deductions := v_server_advances + v_server_carryforward;
    IF v_ben_record.user_id IS NOT NULL AND v_total_deductions > 0 AND v_server_deficit = 0 THEN
      IF v_server_net = 0 THEN
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
$function$;
