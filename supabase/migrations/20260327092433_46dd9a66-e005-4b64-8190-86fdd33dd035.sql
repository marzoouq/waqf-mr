-- C-7: حماية مفاتيح ZATCA OTP من القراءة لغير الناظر
-- تحديث سياسة RLS على app_settings لاستبعاد zatca_otp_* أيضاً
DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings"
  ON public.app_settings
  FOR SELECT
  TO public
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      AND key NOT IN ('pii_encryption_key', 'zatca_otp_1', 'zatca_otp_2')
    )
  );

-- M-9: فهرس مركّب على advance_requests لتحسين أداء مشغل التحقق
CREATE INDEX IF NOT EXISTS idx_advance_requests_ben_fy_status
  ON public.advance_requests (beneficiary_id, fiscal_year_id, status);