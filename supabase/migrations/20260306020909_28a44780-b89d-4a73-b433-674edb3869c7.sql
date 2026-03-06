
-- 1. إعادة إنشاء beneficiaries_safe بقناع ثابت بدل right()
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
  email, phone, notes, user_id, created_at, updated_at
FROM beneficiaries;

-- 2. تقييد قراءة pii_encryption_key على الأدمن فقط
DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings"
ON public.app_settings FOR SELECT
USING (
  (has_role(auth.uid(), 'admin'))
  OR (
    (has_role(auth.uid(), 'beneficiary') OR has_role(auth.uid(), 'waqif') OR has_role(auth.uid(), 'accountant'))
    AND key != 'pii_encryption_key'
  )
);

-- 3. سحب صلاحية تنفيذ cron_check_late_payments من authenticated
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM authenticated;
