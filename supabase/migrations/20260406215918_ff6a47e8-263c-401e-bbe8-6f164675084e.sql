
-- 1. access_log
DROP POLICY IF EXISTS "Admins can view access_log" ON public.access_log;
CREATE POLICY "Admins can view access_log" ON public.access_log
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. access_log_archive
DROP POLICY IF EXISTS "Admins can view access_log_archive" ON public.access_log_archive;
CREATE POLICY "Admins can view access_log_archive" ON public.access_log_archive
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. account_categories
DROP POLICY IF EXISTS "Authorized roles can view account_categories" ON public.account_categories;
CREATE POLICY "Authorized roles can view account_categories" ON public.account_categories
  FOR SELECT USING (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 4. accounts
DROP POLICY IF EXISTS "Authorized roles can view accounts" ON public.accounts;
CREATE POLICY "Authorized roles can view accounts" ON public.accounts
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 5. annual_report_items
DROP POLICY IF EXISTS "Authorized roles can view annual_report_items" ON public.annual_report_items;
CREATE POLICY "Authorized roles can view annual_report_items" ON public.annual_report_items
  FOR SELECT USING (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 6. annual_report_status
DROP POLICY IF EXISTS "Authorized roles can view published annual_report_status" ON public.annual_report_status;
CREATE POLICY "Authorized roles can view published annual_report_status" ON public.annual_report_status
  FOR SELECT USING (
    (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role))
    AND status = 'published'
  );

-- 7. app_settings
DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings" ON public.app_settings
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
      AND key <> ALL (ARRAY['pii_encryption_key', 'zatca_otp_1', 'zatca_otp_2'])
    )
  );

-- 8. audit_log
DROP POLICY IF EXISTS "Admins and accountants can view audit_log" ON public.audit_log;
CREATE POLICY "Admins and accountants can view audit_log" ON public.audit_log
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 9. beneficiaries
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data" ON public.beneficiaries
  FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 10. contract_fiscal_allocations
DROP POLICY IF EXISTS "Authorized roles can view contract_fiscal_allocations" ON public.contract_fiscal_allocations;
CREATE POLICY "Authorized roles can view contract_fiscal_allocations" ON public.contract_fiscal_allocations
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 11. contracts
DROP POLICY IF EXISTS "Admin and accountant can view contracts" ON public.contracts;
CREATE POLICY "Admin and accountant can view contracts" ON public.contracts
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 12. conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    auth.uid() = created_by
    OR (participant_id IS NOT NULL AND auth.uid() = participant_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 13. distributions
DROP POLICY IF EXISTS "Users can view their own distributions" ON public.distributions;
CREATE POLICY "Users can view their own distributions" ON public.distributions
  FOR SELECT TO authenticated USING (
    beneficiary_id IN (SELECT id FROM beneficiaries WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 14. expense_budgets
DROP POLICY IF EXISTS "Authorized roles can view expense_budgets" ON public.expense_budgets;
CREATE POLICY "Authorized roles can view expense_budgets" ON public.expense_budgets
  FOR SELECT USING (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 15. expenses
DROP POLICY IF EXISTS "Authorized roles can view expenses" ON public.expenses;
CREATE POLICY "Authorized roles can view expenses" ON public.expenses
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
  );

-- 16. fiscal_years
DROP POLICY IF EXISTS "Admins and accountants can view all fiscal_years" ON public.fiscal_years;
CREATE POLICY "Admins and accountants can view all fiscal_years" ON public.fiscal_years
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

DROP POLICY IF EXISTS "Beneficiaries and waqif can view published fiscal_years" ON public.fiscal_years;
CREATE POLICY "Beneficiaries and waqif can view published fiscal_years" ON public.fiscal_years
  FOR SELECT USING (
    published = true
    AND (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role))
  );

-- 17. income
DROP POLICY IF EXISTS "Authorized roles can view income" ON public.income;
CREATE POLICY "Authorized roles can view income" ON public.income
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR has_role(auth.uid(), 'beneficiary'::app_role)
  );

-- 18. invoice_chain
DROP POLICY IF EXISTS "Accountants can view invoice_chain" ON public.invoice_chain;
CREATE POLICY "Accountants can view invoice_chain" ON public.invoice_chain
  FOR SELECT TO authenticated USING (
    has_role(auth.uid(), 'accountant'::app_role)
  );

-- 19. waqf_bylaws
DROP POLICY IF EXISTS "Authorized roles can view bylaws" ON public.waqf_bylaws;
CREATE POLICY "Authorized roles can view bylaws" ON public.waqf_bylaws
  FOR SELECT USING (
    has_role(auth.uid(), 'beneficiary'::app_role)
    OR has_role(auth.uid(), 'waqif'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'accountant'::app_role)
  );

-- 20. webauthn_credentials
DROP POLICY IF EXISTS "Admins can view all webauthn credentials" ON public.webauthn_credentials;
CREATE POLICY "Admins can view all webauthn credentials" ON public.webauthn_credentials
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- 21. zatca_operation_log
DROP POLICY IF EXISTS "Admins can view zatca_operation_log" ON public.zatca_operation_log;
CREATE POLICY "Admins can view zatca_operation_log" ON public.zatca_operation_log
  FOR SELECT USING (
    has_role(auth.uid(), 'admin'::app_role)
  );
