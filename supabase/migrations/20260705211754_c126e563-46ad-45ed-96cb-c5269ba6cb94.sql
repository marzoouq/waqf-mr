-- Prevent beneficiary_id from being altered on advance_requests updates
CREATE OR REPLACE FUNCTION public.prevent_advance_beneficiary_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.beneficiary_id IS DISTINCT FROM OLD.beneficiary_id THEN
    RAISE EXCEPTION 'لا يمكن تغيير المستفيد لطلب سلفة قائم';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_advance_beneficiary_change ON public.advance_requests;
CREATE TRIGGER trg_prevent_advance_beneficiary_change
BEFORE UPDATE ON public.advance_requests
FOR EACH ROW
EXECUTE FUNCTION public.prevent_advance_beneficiary_change();