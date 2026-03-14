-- إعادة إنشاء العرض بـ security_invoker لاحترام RLS على الجدول الأصلي
DROP VIEW IF EXISTS public.beneficiaries_safe;

CREATE VIEW public.beneficiaries_safe
WITH (security_barrier=true, security_invoker=true)
AS
  SELECT
    id,
    name,
    share_percentage,
    user_id,
    created_at,
    updated_at,
    '***'::text AS bank_account,
    '***'::text AS email,
    '***'::text AS national_id,
    '***'::text AS notes,
    '***'::text AS phone
  FROM public.beneficiaries;

REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC;
REVOKE ALL ON public.beneficiaries_safe FROM anon;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;