
-- MED-05: Drop and recreate beneficiaries_safe with notes masking
DROP VIEW IF EXISTS public.beneficiaries_safe;

CREATE VIEW public.beneficiaries_safe
WITH (security_barrier = true, security_invoker = false)
AS
SELECT
  b.id,
  b.name,
  b.share_percentage,
  b.user_id,
  b.created_at,
  b.updated_at,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') THEN public.decrypt_pii(b.national_id)
    ELSE '****'
  END AS national_id,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') THEN public.decrypt_pii(b.bank_account)
    ELSE '****'
  END AS bank_account,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') THEN b.email
    WHEN b.user_id = auth.uid() THEN b.email
    ELSE '****'
  END AS email,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') THEN b.phone
    WHEN b.user_id = auth.uid() THEN b.phone
    ELSE '****'
  END AS phone,
  CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant') THEN b.notes
    ELSE NULL
  END AS notes
FROM public.beneficiaries b;

REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC;
REVOKE ALL ON public.beneficiaries_safe FROM anon;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
