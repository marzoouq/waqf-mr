
ALTER TABLE public.support_tickets
  ADD COLUMN rating smallint DEFAULT NULL,
  ADD COLUMN rating_comment text DEFAULT NULL;

-- Validate rating between 1-5
CREATE OR REPLACE FUNCTION public.validate_ticket_rating()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.rating IS NOT NULL AND (NEW.rating < 1 OR NEW.rating > 5) THEN
    RAISE EXCEPTION 'التقييم يجب أن يكون بين 1 و 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_ticket_rating
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_ticket_rating();
