
-- Trigger: منع انتقالات حالة غير صالحة في طلبات السُلف
CREATE OR REPLACE FUNCTION public.validate_advance_status_transition()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- فقط عند تغيير الحالة
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- الانتقالات المسموحة فقط
  IF NOT (
    (OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected'))
    OR (OLD.status = 'approved' AND NEW.status IN ('paid', 'rejected'))
  ) THEN
    RAISE EXCEPTION 'انتقال حالة غير مسموح: من % إلى %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- تطبيق الـ trigger
DROP TRIGGER IF EXISTS trg_validate_advance_status ON public.advance_requests;
CREATE TRIGGER trg_validate_advance_status
  BEFORE UPDATE ON public.advance_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_advance_status_transition();
