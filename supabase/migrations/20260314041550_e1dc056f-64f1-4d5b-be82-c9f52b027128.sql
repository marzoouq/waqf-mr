
-- ============================================================
-- Migration: أمان وأداء — ZATCA-3, SEC-2, PERF-1..4
-- ============================================================

-- ─── ZATCA-3: تشفير private_key في zatca_certificates ───
-- الدالة encrypt_zatca_private_key موجودة بالفعل، نضيف الـ trigger فقط
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_encrypt_zatca_private_key'
  ) THEN
    CREATE TRIGGER trg_encrypt_zatca_private_key
      BEFORE INSERT OR UPDATE OF private_key ON public.zatca_certificates
      FOR EACH ROW EXECUTE FUNCTION public.encrypt_zatca_private_key();
  END IF;
END $$;

-- ─── SEC-2: تمويه الحقول الحرة في audit_trigger_func ───
-- دالة مساعدة لتقنيع الحقول النصية الحرة التي قد تحتوي PII عرضياً
CREATE OR REPLACE FUNCTION public.mask_audit_fields(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $func$
DECLARE
  v_fields text[] := ARRAY['notes', 'description', 'resolution_notes', 'rating_comment', 'content'];
  v_field text;
BEGIN
  IF p_data IS NULL THEN RETURN NULL; END IF;
  FOREACH v_field IN ARRAY v_fields LOOP
    IF p_data ? v_field AND p_data->>v_field IS NOT NULL AND length(p_data->>v_field) > 0 THEN
      p_data := jsonb_set(p_data, ARRAY[v_field], '"[مُقنَّع]"'::jsonb);
    END IF;
  END LOOP;
  RETURN p_data;
END;
$func$;

-- تحديث audit_trigger_func لاستخدام التقنيع
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    v_old := public.mask_audit_fields(v_old);
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
    v_old := public.mask_audit_fields(v_old);
    v_new := public.mask_audit_fields(v_new);
    INSERT INTO public.audit_log (table_name, operation, record_id, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, v_old, v_new, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'beneficiaries' THEN
      v_new := v_new - 'national_id' - 'bank_account';
    END IF;
    v_new := public.mask_audit_fields(v_new);
    INSERT INTO public.audit_log (table_name, operation, record_id, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, v_new, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$func$;

-- ─── PERF-1: فهارس الأداء ───
CREATE INDEX IF NOT EXISTS idx_income_fy_date ON public.income(fiscal_year_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_fy_date ON public.expenses(fiscal_year_id, date);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_date ON public.audit_log(table_name, created_at);

-- ─── PERF-4: has_role optimization ───
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) PARALLEL SAFE;

-- ─── M-6: توحيد beneficiaries_safe ───
-- وفقاً لمعيار v2: security_invoker = true هو المعيار المعتمد
ALTER VIEW public.beneficiaries_safe SET (security_invoker = true);
