CREATE OR REPLACE FUNCTION public.get_public_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN json_build_object(
    'properties', (SELECT count(*) FROM public.properties),
    'beneficiaries', (SELECT count(*) FROM public.beneficiaries),
    'fiscal_years', (SELECT count(*) FROM public.fiscal_years)
  );
END;
$$;