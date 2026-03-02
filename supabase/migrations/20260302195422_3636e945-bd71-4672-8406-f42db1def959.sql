
CREATE OR REPLACE FUNCTION public.get_total_beneficiary_percentage()
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(share_percentage), 0)
  FROM public.beneficiaries
$$;
