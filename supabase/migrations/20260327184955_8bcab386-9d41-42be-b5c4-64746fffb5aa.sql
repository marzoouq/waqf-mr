
-- ══════════════════════════════════════════════════════════════
-- #33: إصلاح ICV PENDING — تقسيم إلى reserve + commit
-- ══════════════════════════════════════════════════════════════

-- دالة حجز ICV فقط (بدون إدراج في السلسلة)
CREATE OR REPLACE FUNCTION public.reserve_icv()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_icv int;
  v_previous_hash text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بحجز ICV';
  END IF;

  v_icv := nextval('public.icv_seq');

  SELECT invoice_hash INTO v_previous_hash
  FROM public.invoice_chain
  WHERE invoice_hash != 'PENDING'
  ORDER BY icv DESC
  LIMIT 1
  FOR UPDATE;

  v_previous_hash := COALESCE(v_previous_hash, '0');

  RETURN jsonb_build_object('icv', v_icv, 'previous_hash', v_previous_hash);
END;
$func$;

-- دالة تثبيت السلسلة بالهاش الحقيقي (بعد نجاح التوقيع)
CREATE OR REPLACE FUNCTION public.commit_icv_chain(
  p_invoice_id uuid,
  p_icv int,
  p_invoice_hash text,
  p_previous_hash text,
  p_source_table text DEFAULT 'payment_invoices'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح بتثبيت سلسلة ICV';
  END IF;

  IF p_source_table NOT IN ('invoices', 'payment_invoices') THEN
    RAISE EXCEPTION 'source_table غير صالح: %', p_source_table;
  END IF;

  IF p_invoice_hash IS NULL OR p_invoice_hash = '' OR p_invoice_hash = 'PENDING' THEN
    RAISE EXCEPTION 'لا يمكن تثبيت هاش PENDING أو فارغ في السلسلة';
  END IF;

  INSERT INTO public.invoice_chain (invoice_id, icv, invoice_hash, previous_hash, source_table)
  VALUES (p_invoice_id, p_icv, p_invoice_hash, p_previous_hash, p_source_table);
END;
$func$;

-- ══════════════════════════════════════════════════════════════
-- #34: إصلاح mask_audit_fields — تقنيع حسب الجدول
-- ══════════════════════════════════════════════════════════════

-- دالة محسّنة تقبل اسم الجدول وتُقنّع فقط حقول PII/الدعم
CREATE OR REPLACE FUNCTION public.mask_audit_fields(p_data jsonb, p_table_name text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $func$
DECLARE
  v_fields text[];
  v_field text;
BEGIN
  IF p_data IS NULL THEN RETURN NULL; END IF;

  -- الجداول التي تحتوي بيانات شخصية/دعم فني — تُقنَّع كلياً
  IF p_table_name IN ('support_tickets', 'support_ticket_replies', 'messages', 'conversations') THEN
    v_fields := ARRAY['notes', 'description', 'resolution_notes', 'rating_comment', 'content'];
  ELSE
    -- الجداول المالية: فقط تقنيع حقول الدعم الفني إن وُجدت (لا تُقنَّع notes/description المالية)
    v_fields := ARRAY['resolution_notes', 'rating_comment'];
  END IF;

  FOREACH v_field IN ARRAY v_fields LOOP
    IF p_data ? v_field AND p_data->>v_field IS NOT NULL AND length(p_data->>v_field) > 0 THEN
      p_data := jsonb_set(p_data, ARRAY[v_field], '"[مُقنَّع]"'::jsonb);
    END IF;
  END LOOP;

  RETURN p_data;
END;
$func$;

-- الحفاظ على التوافق: النسخة بمعامل واحد (للاستدعاءات القديمة)
-- تبقى تُقنّع كل شيء كسابقتها
-- لا حاجة لتعديلها لأن PostgreSQL يدعم overloading

-- تحديث audit_trigger_func لتمرير TG_TABLE_NAME
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    IF TG_TABLE_NAME = 'beneficiaries' THEN
      v_old := v_old - 'national_id' - 'bank_account';
    END IF;
    v_old := public.mask_audit_fields(v_old, TG_TABLE_NAME);
    INSERT INTO public.audit_log (table_name, operation, record_id, old_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, OLD.id, v_old, auth.uid());
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'beneficiaries' THEN
      v_old := v_old - 'national_id' - 'bank_account';
      v_new := v_new - 'national_id' - 'bank_account';
    END IF;
    v_old := public.mask_audit_fields(v_old, TG_TABLE_NAME);
    v_new := public.mask_audit_fields(v_new, TG_TABLE_NAME);
    INSERT INTO public.audit_log (table_name, operation, record_id, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, v_old, v_new, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'beneficiaries' THEN
      v_new := v_new - 'national_id' - 'bank_account';
    END IF;
    v_new := public.mask_audit_fields(v_new, TG_TABLE_NAME);
    INSERT INTO public.audit_log (table_name, operation, record_id, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, v_new, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$func$;

-- تنظيف أي سجلات PENDING قديمة متبقية
DELETE FROM public.invoice_chain WHERE invoice_hash = 'PENDING';
