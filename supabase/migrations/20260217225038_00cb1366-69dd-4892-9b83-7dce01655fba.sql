
CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_modification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fy_status text;
  fy_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    fy_id := OLD.fiscal_year_id;
  ELSE
    fy_id := NEW.fiscal_year_id;
  END IF;

  IF fy_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT status INTO fy_status FROM public.fiscal_years WHERE id = fy_id;

  -- السماح للأدمن بتعديل السنوات المقفلة
  IF fy_status = 'closed' AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'لا يمكن تعديل بيانات سنة مالية مقفلة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
