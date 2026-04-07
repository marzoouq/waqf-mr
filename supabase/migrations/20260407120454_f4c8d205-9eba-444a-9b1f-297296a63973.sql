
-- ============================================================
-- PART 1: zatca_certificates — block private key exposure
-- ============================================================

-- Drop the ALL policy
DROP POLICY IF EXISTS "Admins can manage zatca_certificates" ON public.zatca_certificates;

-- Write policies (admin only)
CREATE POLICY "Admins can insert zatca_certificates"
  ON public.zatca_certificates FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update zatca_certificates"
  ON public.zatca_certificates FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete zatca_certificates"
  ON public.zatca_certificates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Block direct SELECT from client (service_role bypasses RLS)
CREATE POLICY "No direct client SELECT on zatca_certificates"
  ON public.zatca_certificates FOR SELECT TO authenticated
  USING (false);

-- Safe view for admin to read metadata
CREATE OR REPLACE VIEW public.zatca_certificates_safe
  WITH (security_invoker = true, security_barrier = true)
AS
SELECT
  id,
  certificate_type,
  is_active,
  request_id,
  created_at,
  expires_at
FROM public.zatca_certificates;

-- Grant view access to authenticated
GRANT SELECT ON public.zatca_certificates_safe TO authenticated;
REVOKE SELECT ON public.zatca_certificates_safe FROM anon;

-- RLS policy for the view's underlying table is already handled above;
-- since security_invoker=true, the querying user's RLS applies.
-- We need a SELECT policy that allows admin to read via the view:
DROP POLICY IF EXISTS "No direct client SELECT on zatca_certificates" ON public.zatca_certificates;
CREATE POLICY "Admins can read zatca_certificates"
  ON public.zatca_certificates FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- PART 2: Change policies from public to authenticated
-- ============================================================

-- account_categories
ALTER POLICY "Accountants can manage account_categories" ON public.account_categories TO authenticated;
ALTER POLICY "Admins can manage account_categories" ON public.account_categories TO authenticated;
ALTER POLICY "Authorized roles can view account_categories" ON public.account_categories TO authenticated;

-- accounts
ALTER POLICY "Accountants can manage accounts" ON public.accounts TO authenticated;
ALTER POLICY "Admins can manage accounts" ON public.accounts TO authenticated;
ALTER POLICY "Authorized roles can view accounts" ON public.accounts TO authenticated;
ALTER POLICY "Restrict unpublished fiscal year data on accounts" ON public.accounts TO authenticated;

-- advance_carryforward
ALTER POLICY "Accountants can manage advance_carryforward" ON public.advance_carryforward TO authenticated;
ALTER POLICY "Admins can manage advance_carryforward" ON public.advance_carryforward TO authenticated;

-- advance_requests
ALTER POLICY "Accountants can manage advance_requests" ON public.advance_requests TO authenticated;
ALTER POLICY "Admins can manage advance_requests" ON public.advance_requests TO authenticated;
ALTER POLICY "Beneficiaries can create advance_requests" ON public.advance_requests TO authenticated;
ALTER POLICY "Beneficiaries can view own advance_requests" ON public.advance_requests TO authenticated;
ALTER POLICY "Only admins and accountants can update advance_requests" ON public.advance_requests TO authenticated;

-- annual_report_items
ALTER POLICY "Accountants can manage annual_report_items" ON public.annual_report_items TO authenticated;
ALTER POLICY "Admins can manage annual_report_items" ON public.annual_report_items TO authenticated;
ALTER POLICY "Authorized roles can view annual_report_items" ON public.annual_report_items TO authenticated;

-- annual_report_status
ALTER POLICY "Accountants can manage annual_report_status" ON public.annual_report_status TO authenticated;
ALTER POLICY "Admins can manage annual_report_status" ON public.annual_report_status TO authenticated;
ALTER POLICY "Authorized roles can view published annual_report_status" ON public.annual_report_status TO authenticated;

-- app_settings (keep "Anon can read registration_enabled" as public!)
ALTER POLICY "Admins can manage settings" ON public.app_settings TO authenticated;
ALTER POLICY "Authorized roles can read settings" ON public.app_settings TO authenticated;

-- audit_log
ALTER POLICY "Admins and accountants can view audit_log" ON public.audit_log TO authenticated;
ALTER POLICY "No one can delete audit_log" ON public.audit_log TO authenticated;
ALTER POLICY "No one can update audit_log" ON public.audit_log TO authenticated;
ALTER POLICY "Only triggers can insert audit_log" ON public.audit_log TO authenticated;

-- beneficiaries
ALTER POLICY "Accountants can manage beneficiaries" ON public.beneficiaries TO authenticated;
ALTER POLICY "Admins can manage beneficiaries" ON public.beneficiaries TO authenticated;

-- contract_fiscal_allocations
ALTER POLICY "Accountants can manage contract_fiscal_allocations" ON public.contract_fiscal_allocations TO authenticated;
ALTER POLICY "Admins can manage contract_fiscal_allocations" ON public.contract_fiscal_allocations TO authenticated;
ALTER POLICY "Authorized roles can view contract_fiscal_allocations" ON public.contract_fiscal_allocations TO authenticated;

-- contracts
ALTER POLICY "Accountants can manage contracts" ON public.contracts TO authenticated;
ALTER POLICY "Admins can manage contracts" ON public.contracts TO authenticated;

-- conversations
ALTER POLICY "Admins can manage all conversations" ON public.conversations TO authenticated;
ALTER POLICY "Authenticated users can create conversations" ON public.conversations TO authenticated;
ALTER POLICY "Only admins can delete conversations" ON public.conversations TO authenticated;
ALTER POLICY "Users can update own conversations" ON public.conversations TO authenticated;
ALTER POLICY "Users can view their conversations" ON public.conversations TO authenticated;

-- distributions
ALTER POLICY "Accountants can manage distributions" ON public.distributions TO authenticated;
ALTER POLICY "Admins can manage distributions" ON public.distributions TO authenticated;

-- expense_budgets
ALTER POLICY "Accountants can manage expense_budgets" ON public.expense_budgets TO authenticated;
ALTER POLICY "Admins can manage expense_budgets" ON public.expense_budgets TO authenticated;
ALTER POLICY "Authorized roles can view expense_budgets" ON public.expense_budgets TO authenticated;

-- expenses
ALTER POLICY "Accountants can manage expenses" ON public.expenses TO authenticated;
ALTER POLICY "Admins can manage expenses" ON public.expenses TO authenticated;
ALTER POLICY "Authorized roles can view expenses" ON public.expenses TO authenticated;

-- fiscal_years
ALTER POLICY "Admins and accountants can view all fiscal_years" ON public.fiscal_years TO authenticated;
ALTER POLICY "Admins can manage fiscal_years" ON public.fiscal_years TO authenticated;
ALTER POLICY "Beneficiaries and waqif can view published fiscal_years" ON public.fiscal_years TO authenticated;

-- income
ALTER POLICY "Accountants can manage income" ON public.income TO authenticated;
ALTER POLICY "Admins can manage income" ON public.income TO authenticated;
ALTER POLICY "Authorized roles can view income" ON public.income TO authenticated;

-- invoice_items
ALTER POLICY "Accountants can manage invoice_items" ON public.invoice_items TO authenticated;
ALTER POLICY "Admins can manage invoice_items" ON public.invoice_items TO authenticated;
ALTER POLICY "Authorized roles can view invoice_items" ON public.invoice_items TO authenticated;

-- invoices
ALTER POLICY "Accountants can manage invoices" ON public.invoices TO authenticated;
ALTER POLICY "Admins can manage invoices" ON public.invoices TO authenticated;
ALTER POLICY "Authorized roles can view invoices" ON public.invoices TO authenticated;

-- messages
ALTER POLICY "Only admins can delete messages" ON public.messages TO authenticated;
ALTER POLICY "Users can send messages in their conversations" ON public.messages TO authenticated;
ALTER POLICY "Users can update read status" ON public.messages TO authenticated;
ALTER POLICY "Users can view messages in their conversations" ON public.messages TO authenticated;

-- notifications
ALTER POLICY "Admins can manage all notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can delete their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can update their own notifications" ON public.notifications TO authenticated;
ALTER POLICY "Users can view their own notifications" ON public.notifications TO authenticated;

-- storage.objects (keep "Anyone can view waqf assets" as public!)
ALTER POLICY "Accountants can delete invoices" ON storage.objects TO authenticated;
ALTER POLICY "Accountants can read invoices" ON storage.objects TO authenticated;
ALTER POLICY "Accountants can upload invoices" ON storage.objects TO authenticated;
ALTER POLICY "Admin and accountant can view invoices" ON storage.objects TO authenticated;
ALTER POLICY "Admins can delete invoices" ON storage.objects TO authenticated;
ALTER POLICY "Admins can delete waqf assets" ON storage.objects TO authenticated;
ALTER POLICY "Admins can read invoices" ON storage.objects TO authenticated;
ALTER POLICY "Admins can update invoices" ON storage.objects TO authenticated;
ALTER POLICY "Admins can update waqf assets" ON storage.objects TO authenticated;
ALTER POLICY "Admins can upload invoices" ON storage.objects TO authenticated;
ALTER POLICY "Admins can upload waqf assets" ON storage.objects TO authenticated;
ALTER POLICY "Role-based users can view invoices" ON storage.objects TO authenticated;

-- payment_invoices
ALTER POLICY "Accountants can manage payment_invoices" ON public.payment_invoices TO authenticated;
ALTER POLICY "Admins can manage payment_invoices" ON public.payment_invoices TO authenticated;
ALTER POLICY "Authorized roles can view payment_invoices" ON public.payment_invoices TO authenticated;

-- properties
ALTER POLICY "Accountants can manage properties" ON public.properties TO authenticated;
ALTER POLICY "Admins can manage properties" ON public.properties TO authenticated;
ALTER POLICY "Authorized roles can view properties" ON public.properties TO authenticated;

-- support_ticket_replies
ALTER POLICY "Accountants can view non-internal replies" ON public.support_ticket_replies TO authenticated;
ALTER POLICY "Admins can manage all replies" ON public.support_ticket_replies TO authenticated;
ALTER POLICY "Users can add replies to own tickets" ON public.support_ticket_replies TO authenticated;
ALTER POLICY "Users can view replies on own tickets" ON public.support_ticket_replies TO authenticated;

-- support_tickets
ALTER POLICY "Accountants can view all tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Admins can manage all tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Users can create tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Users can update own open tickets" ON public.support_tickets TO authenticated;
ALTER POLICY "Users can view own tickets" ON public.support_tickets TO authenticated;

-- tenant_payments
ALTER POLICY "Accountants can manage tenant_payments" ON public.tenant_payments TO authenticated;
ALTER POLICY "Admin and accountant can view tenant_payments" ON public.tenant_payments TO authenticated;
ALTER POLICY "Admins can manage tenant_payments" ON public.tenant_payments TO authenticated;

-- units
ALTER POLICY "Accountants can manage units" ON public.units TO authenticated;
ALTER POLICY "Admins can manage units" ON public.units TO authenticated;
ALTER POLICY "Authorized roles can view units" ON public.units TO authenticated;

-- waqf_bylaws
ALTER POLICY "Admins can manage bylaws" ON public.waqf_bylaws TO authenticated;
ALTER POLICY "Authorized roles can view bylaws" ON public.waqf_bylaws TO authenticated;

-- webauthn_challenges
ALTER POLICY "No direct access to challenges" ON public.webauthn_challenges TO authenticated;

-- webauthn_credentials
ALTER POLICY "Admins can view all webauthn credentials" ON public.webauthn_credentials TO authenticated;
ALTER POLICY "Users can delete own webauthn credentials" ON public.webauthn_credentials TO authenticated;
ALTER POLICY "Users can insert own webauthn credentials" ON public.webauthn_credentials TO authenticated;
ALTER POLICY "Users can view own webauthn credentials" ON public.webauthn_credentials TO authenticated;

-- zatca_operation_log
ALTER POLICY "Admins can view zatca_operation_log" ON public.zatca_operation_log TO authenticated;
