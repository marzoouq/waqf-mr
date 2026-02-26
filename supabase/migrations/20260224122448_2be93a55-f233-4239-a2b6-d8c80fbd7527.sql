
CREATE OR REPLACE FUNCTION public.reorder_bylaws(items jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  item jsonb;
BEGIN
  -- Validate caller is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'غير مصرح بإعادة ترتيب اللوائح';
  END IF;

  -- Update all sort_orders in a single transaction
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    UPDATE public.waqf_bylaws
    SET sort_order = (item->>'sort_order')::int
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
