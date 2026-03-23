-- إصلاح صلاحيات العروض الآمنة — إزالة INSERT/UPDATE/DELETE الزائدة من authenticated
REVOKE ALL ON public.beneficiaries_safe FROM authenticated;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

REVOKE ALL ON public.contracts_safe FROM authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;