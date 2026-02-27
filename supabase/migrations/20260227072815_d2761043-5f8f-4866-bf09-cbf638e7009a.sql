-- Trigger لمنع وجود أكثر من سنة مالية نشطة
CREATE OR REPLACE FUNCTION enforce_single_active_fy()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE fiscal_years SET status = 'closed'
    WHERE status = 'active' AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public';

DROP TRIGGER IF EXISTS trg_single_active_fy ON fiscal_years;
CREATE TRIGGER trg_single_active_fy
BEFORE INSERT OR UPDATE ON fiscal_years
FOR EACH ROW EXECUTE FUNCTION enforce_single_active_fy();