-- R5: تشديد أمان قاعدة البيانات (W6 forensic round 2)
-- 1) إضافة role guards لدوال SECURITY DEFINER المكشوفة لأي authenticated
-- 2) إزالة fallback النص الساطع في consume_zatca_otp
-- 3) سحب EXECUTE من دوال trigger و cron عن authenticated
-- 4) تفعيل security_barrier على disbursement_vouchers_public

-- ============================================================
-- (1A) get_support_stats: admin/accountant فقط
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_support_stats()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحية إدارية' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT json_build_object(
      'totalTickets', t.total,
      'openTickets', t.open_count,
      'inProgressTickets', t.in_progress_count,
      'resolvedTickets', t.resolved_count,
      'highPriorityTickets', t.high_priority_count,
      'ticketsLast7d', t.last_7d_count,
      'totalErrors', e.total_errors,
      'errorsLast24h', e.errors_24h,
      'errorsLast7d', e.errors_7d
    )
    FROM (
      SELECT
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status = 'open') AS open_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress_count,
        COUNT(*) FILTER (WHERE status IN ('resolved','closed')) AS resolved_count,
        COUNT(*) FILTER (WHERE priority IN ('high','critical')) AS high_priority_count,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS last_7d_count
      FROM support_tickets
    ) t,
    (
      SELECT
        COUNT(*) AS total_errors,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '24 hours') AS errors_24h,
        COUNT(*) FILTER (WHERE created_at >= now() - interval '7 days') AS errors_7d
      FROM access_log
      WHERE event_type = 'client_error'
    ) e
  );
END;
$function$;

-- ============================================================
-- (1B) get_support_analytics: admin/accountant فقط
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_support_analytics()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN
    RAISE EXCEPTION 'غير مصرح: مطلوب صلاحية إدارية' USING ERRCODE = '42501';
  END IF;
  RETURN (
    SELECT json_build_object(
      'category_stats', COALESCE((
        SELECT json_agg(json_build_object('key', category, 'count', cnt))
        FROM (SELECT category, count(*)::int AS cnt FROM support_tickets GROUP BY category ORDER BY cnt DESC) sub
      ), '[]'::json),
      'priority_stats', COALESCE((
        SELECT json_agg(json_build_object('key', priority, 'count', cnt))
        FROM (SELECT priority, count(*)::int AS cnt FROM support_tickets GROUP BY priority ORDER BY cnt DESC) sub
      ), '[]'::json),
      'avg_resolution_hours', COALESCE((
        SELECT ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::numeric, 1)
        FROM support_tickets WHERE resolved_at IS NOT NULL
      ), 0),
      'avg_rating', COALESCE((
        SELECT ROUND(AVG(rating)::numeric, 1)
        FROM support_tickets WHERE rating IS NOT NULL
      ), 0),
      'rated_count', (SELECT count(*)::int FROM support_tickets WHERE rating IS NOT NULL),
      'total_count', (SELECT count(*)::int FROM support_tickets)
    )
  );
END;
$function$;

-- ============================================================
-- (1C) get_max_advance_amount: المستفيد لنفسه فقط أو admin/accountant
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_max_advance_amount(p_beneficiary_id uuid, p_fiscal_year_id uuid)
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
  v_owner uuid;
BEGIN
  -- حارس الوصول: admin/accountant أو المستفيد نفسه
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)) THEN
    SELECT user_id INTO v_owner FROM public.beneficiaries WHERE id = p_beneficiary_id;
    IF v_owner IS NULL OR v_owner <> auth.uid() THEN
      RAISE EXCEPTION 'غير مصرح: لا يمكنك قراءة حد سلفة مستفيد آخر' USING ERRCODE = '42501';
    END IF;
  END IF;

  SELECT share_percentage INTO v_share_pct FROM beneficiaries WHERE id = p_beneficiary_id;
  IF v_share_pct IS NULL THEN
    RETURN jsonb_build_object('error', 'المستفيد غير موجود');
  END IF;

  SELECT COALESCE(SUM(share_percentage), 0) INTO v_total_pct FROM beneficiaries;
  IF v_total_pct <= 0 THEN
    RETURN jsonb_build_object('error', 'لا يوجد مستفيدون بنسب صالحة');
  END IF;

  SELECT COALESCE(waqf_revenue - waqf_corpus_manual, 0) INTO v_available_amount
  FROM accounts WHERE fiscal_year_id = p_fiscal_year_id ORDER BY created_at DESC LIMIT 1;
  IF v_available_amount IS NULL OR v_available_amount <= 0 THEN
    v_available_amount := 0;
  END IF;

  v_estimated_share := v_available_amount * v_share_pct / v_total_pct;

  SELECT COALESCE(SUM(amount), 0) INTO v_active_carryforward
  FROM advance_carryforward WHERE beneficiary_id = p_beneficiary_id AND status = 'active';

  v_effective_share := GREATEST(0, v_estimated_share - v_active_carryforward);

  SELECT COALESCE(SUM(amount), 0) INTO v_paid_advances
  FROM advance_requests
  WHERE beneficiary_id = p_beneficiary_id AND fiscal_year_id = p_fiscal_year_id AND status = 'paid';

  SELECT value INTO v_advance_settings_json FROM app_settings WHERE key = 'advance_settings';
  IF v_advance_settings_json IS NOT NULL THEN
    v_max_percentage := COALESCE((v_advance_settings_json::jsonb->>'max_percentage')::numeric, 50);
  ELSE
    SELECT COALESCE(value::numeric, 50) INTO v_max_percentage
    FROM app_settings WHERE key = 'advance_max_percentage';
    IF v_max_percentage IS NULL THEN v_max_percentage := 50; END IF;
  END IF;

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

-- ملاحظة: get_total_beneficiary_percentage تُرجع رقماً غير حساس (إجمالي النسب)
-- وتُستخدم من المستفيد لحساب حصته الذاتية. لا حارس مطلوب.

-- ============================================================
-- (2) consume_zatca_otp: إزالة fallback النص الساطع
-- ============================================================
CREATE OR REPLACE FUNCTION public.consume_zatca_otp()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
  v_encrypted text;
  v_plain text;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets WHERE name = 'pii_encryption_key' LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'مفتاح التشفير غير متاح في الخزنة' USING ERRCODE = 'P0001';
  END IF;

  SELECT value INTO v_encrypted FROM public.app_settings
   WHERE key = 'zatca_otp_2' AND value IS NOT NULL AND value <> '' LIMIT 1;
  IF v_encrypted IS NULL THEN
    SELECT value INTO v_encrypted FROM public.app_settings
     WHERE key = 'zatca_otp_1' AND value IS NOT NULL AND value <> '' LIMIT 1;
  END IF;
  IF v_encrypted IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    v_plain := extensions.pgp_sym_decrypt(decode(v_encrypted, 'base64'), v_key);
  EXCEPTION WHEN OTHERS THEN
    -- لا نعيد النص الساطع — نرفض ونحذف القيمة المعطوبة
    DELETE FROM public.app_settings WHERE key IN ('zatca_otp_1','zatca_otp_2');
    RAISE EXCEPTION 'فشل فك تشفير OTP — أعد الإدخال' USING ERRCODE = 'P0001';
  END;

  DELETE FROM public.app_settings WHERE key IN ('zatca_otp_1','zatca_otp_2');
  RETURN v_plain;
END;
$function$;

-- ============================================================
-- (3) سحب EXECUTE من authenticated عن trigger fn و cron fn
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.encrypt_zatca_otp_setting() FROM PUBLIC, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM PUBLIC, authenticated;

-- ============================================================
-- (4) تفعيل security_barrier على disbursement_vouchers_public
-- ============================================================
ALTER VIEW public.disbursement_vouchers_public SET (security_barrier = true);

-- ============================================================
-- (5) تأكيد صلاحيات RPCs بعد التعديل
-- ============================================================
GRANT EXECUTE ON FUNCTION public.get_support_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_support_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_max_advance_amount(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_zatca_otp() TO service_role;
REVOKE EXECUTE ON FUNCTION public.consume_zatca_otp() FROM PUBLIC, authenticated;