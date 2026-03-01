
-- C-05: Sanitize PII fields from audit_log entries for beneficiaries table
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    -- Redact PII fields from beneficiaries table
    IF TG_TABLE_NAME = 'beneficiaries' THEN
      v_old := v_old - 'national_id' - 'bank_account';
    END IF;
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
    INSERT INTO public.audit_log (table_name, operation, record_id, old_data, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, v_old, v_new, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    IF TG_TABLE_NAME = 'beneficiaries' THEN
      v_new := v_new - 'national_id' - 'bank_account';
    END IF;
    INSERT INTO public.audit_log (table_name, operation, record_id, new_data, user_id)
    VALUES (TG_TABLE_NAME, TG_OP, NEW.id, v_new, auth.uid());
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$;
