
-- FIX: إخفاء email و phone في beneficiaries_safe للمستفيدين والواقفين
DROP VIEW IF EXISTS public.beneficiaries_safe;
CREATE VIEW public.beneficiaries_safe WITH (security_invoker=on) AS
SELECT id, name, share_percentage,
  CASE
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
    THEN national_id
    ELSE CASE WHEN national_id IS NOT NULL THEN '********' ELSE NULL END
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
    THEN bank_account
    ELSE CASE WHEN bank_account IS NOT NULL THEN '********' ELSE NULL END
  END AS bank_account,
  CASE
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
    THEN email
    ELSE CASE WHEN email IS NOT NULL THEN '***@***' ELSE NULL END
  END AS email,
  CASE
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant')
    THEN phone
    ELSE CASE WHEN phone IS NOT NULL THEN '********' ELSE NULL END
  END AS phone,
  notes, user_id, created_at, updated_at
FROM beneficiaries;
