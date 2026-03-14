
-- =============================================
-- إصلاح 10 مشاكل جنائية جديدة — 2026-03-14
-- =============================================

-- ============================================================
-- NEW-CRIT-1: حماية مفتاح التشفير في lookup_by_national_id
-- إضافة فحص أن المستدعي service_role قبل قراءة المفتاح
-- ============================================================
CREATE OR REPLACE FUNCTION public.lookup_by_national_id(p_national_id text)
RETURNS TABLE(email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_key text;
  rec record;
  v_decrypted text;
BEGIN
  -- فحص أن المستدعي هو service_role فقط
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'هذه الدالة مخصصة لـ service_role فقط';
  END IF;

  v_key := (SELECT value FROM public.app_settings WHERE key = 'pii_encryption_key' LIMIT 1);
  
  IF v_key IS NULL OR v_key = '' THEN
    RETURN;
  END IF;

  FOR rec IN
    SELECT b.national_id AS enc_nid, b.email AS ben_email
    FROM public.beneficiaries b
    WHERE b.national_id IS NOT NULL
  LOOP
    BEGIN
      v_decrypted := extensions.pgp_sym_decrypt(decode(rec.enc_nid, 'base64'), v_key);
      IF v_decrypted = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      IF rec.enc_nid = p_national_id THEN
        email := rec.ben_email;
        RETURN NEXT;
        RETURN;
      END IF;
    END;
  END LOOP;

  RETURN;
END;
$$;

-- سحب الصلاحيات
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM PUBLIC;

-- ============================================================
-- NEW-CRIT-2: Event Trigger يشمل ALTER FUNCTION
-- ============================================================
DROP EVENT TRIGGER IF EXISTS trg_auto_revoke_anon_execute;
CREATE EVENT TRIGGER trg_auto_revoke_anon_execute
ON ddl_command_end
WHEN TAG IN ('CREATE FUNCTION', 'ALTER FUNCTION')
EXECUTE FUNCTION public.auto_revoke_anon_execute();

-- ============================================================
-- NEW-CRIT-3: منح المحاسب SELECT على zatca_certificates و invoice_chain
-- ============================================================
CREATE POLICY "Accountants can view zatca_certificates"
  ON public.zatca_certificates FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'::public.app_role));

CREATE POLICY "Accountants can view invoice_chain"
  ON public.invoice_chain FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'accountant'::public.app_role));

-- ============================================================
-- NEW-HIGH-1: إصلاح dedup في cron_check_contract_expiry
-- فصل فحص التكرار للأدمن والمستفيد بشكل مستقل
-- ============================================================
CREATE OR REPLACE FUNCTION public.cron_check_contract_expiry()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  contract record;
  days_left int;
  msg text;
  ben_msg text;
BEGIN
  -- 1) عقود تنتهي خلال 30 يوم
  FOR contract IN
    SELECT id, contract_number, tenant_name, end_date
    FROM contracts
    WHERE status = 'active'
      AND end_date >= CURRENT_DATE
      AND end_date <= CURRENT_DATE + interval '30 days'
  LOOP
    days_left := (contract.end_date - CURRENT_DATE);
    msg := 'عقد رقم ' || contract.contract_number || ' (' || contract.tenant_name || ') ينتهي خلال ' || days_left || ' يوم';
    ben_msg := 'أحد العقود قارب على الانتهاء خلال ' || days_left || ' يوم';

    -- إشعار الأدمن — dedup مستقل
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE message = msg AND created_at >= CURRENT_DATE::timestamptz AND type = 'warning'
      LIMIT 1
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      SELECT ur.user_id, 'تنبيه: عقد قارب على الانتهاء', msg, 'warning', '/dashboard/contracts'
      FROM user_roles ur WHERE ur.role = 'admin';
    END IF;

    -- إشعار المستفيدين — dedup مستقل عن الأدمن
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE message = ben_msg AND created_at >= CURRENT_DATE::timestamptz AND type = 'warning'
      LIMIT 1
    ) THEN
      INSERT INTO notifications (user_id, title, message, type, link)
      SELECT b.user_id, 'تنبيه: عقد قارب على الانتهاء', ben_msg, 'warning', '/beneficiary/notifications'
      FROM beneficiaries b WHERE b.user_id IS NOT NULL;
    END IF;
  END LOOP;

  -- 2) تذكير أسبوعي بالعقود المنتهية (أيام الأحد — للأدمن فقط)
  IF EXTRACT(DOW FROM CURRENT_DATE) = 0 THEN
    DECLARE
      expired_total int;
      expired_msg text;
    BEGIN
      SELECT count(*) INTO expired_total FROM contracts WHERE status = 'expired';
      IF expired_total > 0 THEN
        expired_msg := 'يوجد ' || expired_total || ' عقد منتهي لم يتم تجديده';
        IF NOT EXISTS (
          SELECT 1 FROM notifications WHERE message = expired_msg AND created_at >= CURRENT_DATE::timestamptz LIMIT 1
        ) THEN
          INSERT INTO notifications (user_id, title, message, type, link)
          SELECT ur.user_id, 'تذكير: عقود منتهية تحتاج تجديد', expired_msg, 'warning', '/dashboard/contracts'
          FROM user_roles ur WHERE ur.role = 'admin';
        END IF;
      END IF;
    END;
  END IF;
END;
$function$;

-- ============================================================
-- NEW-HIGH-2: إضافة WITH CHECK لسياسة UPDATE على support_tickets
-- ============================================================
DROP POLICY IF EXISTS "Users can update own open tickets" ON public.support_tickets;
CREATE POLICY "Users can update own open tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = created_by AND status = 'open')
  WITH CHECK (auth.uid() = created_by AND status = 'open');

-- ============================================================
-- NEW-HIGH-3: تقييد INSERT على support_ticket_replies للتذاكر غير المغلقة
-- ============================================================
DROP POLICY IF EXISTS "Users can add replies to own tickets" ON public.support_ticket_replies;
CREATE POLICY "Users can add replies to own tickets"
  ON public.support_ticket_replies FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_ticket_replies.ticket_id
        AND t.created_by = auth.uid()
        AND t.status NOT IN ('closed', 'cancelled', 'resolved')
    )
  );

-- ============================================================
-- NEW-HIGH-4: get_next_icv() مع advisory lock لمنع race condition
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_icv()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_next int;
BEGIN
  -- قفل ذري على مستوى المعاملة لمنع race condition
  PERFORM pg_advisory_xact_lock(hashtext('icv_lock'));
  SELECT COALESCE(MAX(icv), 0) + 1 INTO v_next FROM invoice_chain;
  RETURN v_next;
END;
$$;

-- ============================================================
-- NEW-MED-2: Audit triggers لـ support_tickets و support_ticket_replies
-- ============================================================
CREATE TRIGGER audit_support_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_support_ticket_replies
  AFTER INSERT OR UPDATE OR DELETE ON public.support_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ============================================================
-- NEW-MED-3: إضافة extensions. prefix صريح لـ encrypt_pii و decrypt_pii
-- ============================================================
CREATE OR REPLACE FUNCTION public.encrypt_pii(p_value text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF p_value IS NULL OR p_value = '' THEN
    RETURN p_value;
  END IF;
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN p_value;
  END IF;
  RETURN encode(extensions.pgp_sym_encrypt(p_value, v_key), 'base64');
END;
$function$;

CREATE OR REPLACE FUNCTION public.decrypt_pii(p_encrypted text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  IF p_encrypted IS NULL OR p_encrypted = '' THEN
    RETURN p_encrypted;
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RETURN '********';
  END IF;
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN p_encrypted;
  END IF;
  BEGIN
    RETURN extensions.pgp_sym_decrypt(decode(p_encrypted, 'base64'), v_key);
  EXCEPTION WHEN OTHERS THEN
    RETURN p_encrypted;
  END;
END;
$function$;

-- تحديث encrypt_beneficiary_pii أيضاً
CREATE OR REPLACE FUNCTION public.encrypt_beneficiary_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_key text;
BEGIN
  v_key := public.get_pii_key();
  IF v_key IS NULL OR v_key = '' THEN
    RETURN NEW;
  END IF;

  IF NEW.national_id IS NOT NULL AND NEW.national_id != '' THEN
    BEGIN
      PERFORM extensions.pgp_sym_decrypt(decode(NEW.national_id, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      NEW.national_id := encode(extensions.pgp_sym_encrypt(NEW.national_id, v_key), 'base64');
    END;
  END IF;

  IF NEW.bank_account IS NOT NULL AND NEW.bank_account != '' THEN
    BEGIN
      PERFORM extensions.pgp_sym_decrypt(decode(NEW.bank_account, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      NEW.bank_account := encode(extensions.pgp_sym_encrypt(NEW.bank_account, v_key), 'base64');
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- تحديث get_active_zatca_certificate أيضاً
CREATE OR REPLACE FUNCTION public.get_active_zatca_certificate()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_cert RECORD;
  v_key text;
  v_decrypted_pk text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بالوصول لشهادات ZATCA';
  END IF;

  SELECT * INTO v_cert FROM zatca_certificates WHERE is_active = true LIMIT 1;
  IF v_cert IS NULL THEN
    RETURN jsonb_build_object('error', 'لا توجد شهادة نشطة');
  END IF;

  v_key := public.get_pii_key();
  IF v_key IS NOT NULL AND v_key != '' THEN
    BEGIN
      v_decrypted_pk := extensions.pgp_sym_decrypt(decode(v_cert.private_key, 'base64'), v_key);
    EXCEPTION WHEN OTHERS THEN
      v_decrypted_pk := v_cert.private_key;
    END;
  ELSE
    v_decrypted_pk := v_cert.private_key;
  END IF;

  RETURN jsonb_build_object(
    'id', v_cert.id,
    'certificate', v_cert.certificate,
    'private_key', v_decrypted_pk,
    'zatca_secret', COALESCE(v_cert.zatca_secret, ''),
    'certificate_type', v_cert.certificate_type,
    'request_id', v_cert.request_id
  );
END;
$function$;
