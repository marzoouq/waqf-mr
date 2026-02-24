-- دالة مزامنة حالة الوحدة تلقائياً عند تغيير العقود
CREATE OR REPLACE FUNCTION public.sync_unit_status_on_contract_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_unit_id uuid;
  has_active boolean;
BEGIN
  -- تحديد الوحدة المتأثرة
  IF TG_OP = 'DELETE' THEN
    target_unit_id := OLD.unit_id;
  ELSE
    target_unit_id := NEW.unit_id;
    -- إذا تغيرت الوحدة في UPDATE، نعالج الوحدة القديمة أيضاً
    IF TG_OP = 'UPDATE' AND OLD.unit_id IS DISTINCT FROM NEW.unit_id AND OLD.unit_id IS NOT NULL THEN
      SELECT EXISTS (
        SELECT 1 FROM contracts WHERE unit_id = OLD.unit_id AND status = 'active'
      ) INTO has_active;
      IF NOT has_active THEN
        UPDATE units SET status = 'شاغرة' WHERE id = OLD.unit_id AND status = 'مؤجرة';
      END IF;
    END IF;
  END IF;

  IF target_unit_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- التحقق من وجود عقد نشط للوحدة
  SELECT EXISTS (
    SELECT 1 FROM contracts WHERE unit_id = target_unit_id AND status = 'active'
  ) INTO has_active;

  IF has_active THEN
    UPDATE units SET status = 'مؤجرة' WHERE id = target_unit_id AND status != 'صيانة';
  ELSE
    UPDATE units SET status = 'شاغرة' WHERE id = target_unit_id AND status = 'مؤجرة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- ربط الدالة بجدول العقود
CREATE TRIGGER sync_unit_status_trigger
  AFTER INSERT OR UPDATE OR DELETE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION sync_unit_status_on_contract_change();