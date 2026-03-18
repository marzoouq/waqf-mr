
-- Fix search_path for validate_category_type
CREATE OR REPLACE FUNCTION validate_category_type()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.category_type NOT IN ('income','expense','tax','distribution') THEN
    RAISE EXCEPTION 'Invalid category_type: %', NEW.category_type;
  END IF;
  RETURN NEW;
END;
$$;
