
-- Create a view that masks sensitive fields for non-admin users
CREATE OR REPLACE VIEW public.beneficiaries_safe
WITH (security_invoker = on) AS
SELECT
  id,
  name,
  share_percentage,
  CASE
    WHEN has_role(auth.uid(), 'admin') THEN national_id
    ELSE CASE WHEN national_id IS NOT NULL THEN '******' || RIGHT(national_id, 4) ELSE NULL END
  END AS national_id,
  CASE
    WHEN has_role(auth.uid(), 'admin') THEN bank_account
    ELSE CASE WHEN bank_account IS NOT NULL THEN '******' || RIGHT(bank_account, 4) ELSE NULL END
  END AS bank_account,
  CASE
    WHEN has_role(auth.uid(), 'admin') THEN email
    ELSE CASE WHEN email IS NOT NULL THEN '***@***' ELSE NULL END
  END AS email,
  CASE
    WHEN has_role(auth.uid(), 'admin') THEN phone
    ELSE CASE WHEN phone IS NOT NULL THEN '******' || RIGHT(phone, 4) ELSE NULL END
  END AS phone,
  notes,
  user_id,
  created_at,
  updated_at
FROM public.beneficiaries;
