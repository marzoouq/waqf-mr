-- ═══════════════════════════════════════════════════════════
-- دالة مساعدة: jwt_role() — تقرأ الدور من JWT claims مباشرة
-- أسرع بكثير من has_role() لأنها لا تستعلم جدول user_roles
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.jwt_role()
RETURNS text
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'user_role',
    (auth.jwt() -> 'app_metadata' ->> 'user_role')
  )
$$;

-- access_log: Admins can view access_log
DROP POLICY IF EXISTS "Admins can view access_log" ON public.access_log;
CREATE POLICY "Admins can view access_log"
  ON public.access_log
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((jwt_role() = 'admin'));

-- access_log_archive: Admins can view access_log_archive
DROP POLICY IF EXISTS "Admins can view access_log_archive" ON public.access_log_archive;
CREATE POLICY "Admins can view access_log_archive"
  ON public.access_log_archive
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((jwt_role() = 'admin'));

-- account_categories: Authorized roles can view account_categories
DROP POLICY IF EXISTS "Authorized roles can view account_categories" ON public.account_categories;
CREATE POLICY "Authorized roles can view account_categories"
  ON public.account_categories
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('beneficiary','waqif'));

-- accounts: Authorized roles can view accounts
DROP POLICY IF EXISTS "Authorized roles can view accounts" ON public.accounts;
CREATE POLICY "Authorized roles can view accounts"
  ON public.accounts
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif','accountant'));

-- annual_report_items: Authorized roles can view annual_report_items
DROP POLICY IF EXISTS "Authorized roles can view annual_report_items" ON public.annual_report_items;
CREATE POLICY "Authorized roles can view annual_report_items"
  ON public.annual_report_items
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('beneficiary','waqif'));

-- annual_report_status: Authorized roles can view published annual_report_status
DROP POLICY IF EXISTS "Authorized roles can view published annual_report_status" ON public.annual_report_status;
CREATE POLICY "Authorized roles can view published annual_report_status"
  ON public.annual_report_status
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('beneficiary','waqif') AND (status = 'published'::text));

-- app_settings: Authorized roles can read settings
DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings"
  ON public.app_settings
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((jwt_role() = 'admin') OR ((jwt_role() IN ('beneficiary','waqif','accountant')) AND (key <> ALL (ARRAY['pii_encryption_key'::text, 'zatca_otp_1'::text, 'zatca_otp_2'::text]))));

-- audit_log: Admins and accountants can view audit_log
DROP POLICY IF EXISTS "Admins and accountants can view audit_log" ON public.audit_log;
CREATE POLICY "Admins and accountants can view audit_log"
  ON public.audit_log
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','accountant'));

-- beneficiaries: Beneficiaries can view their own data
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data"
  ON public.beneficiaries
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()) OR jwt_role() IN ('admin','accountant'));

-- contract_fiscal_allocations: Authorized roles can view contract_fiscal_allocations
DROP POLICY IF EXISTS "Authorized roles can view contract_fiscal_allocations" ON public.contract_fiscal_allocations;
CREATE POLICY "Authorized roles can view contract_fiscal_allocations"
  ON public.contract_fiscal_allocations
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif'));

-- contracts: Admin and accountant can view contracts
DROP POLICY IF EXISTS "Admin and accountant can view contracts" ON public.contracts;
CREATE POLICY "Admin and accountant can view contracts"
  ON public.contracts
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (jwt_role() IN ('admin','accountant'));

-- conversations: Users can view their conversations
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
CREATE POLICY "Users can view their conversations"
  ON public.conversations
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((auth.uid() = created_by) OR ((participant_id IS NOT NULL) AND (auth.uid() = participant_id)) OR (jwt_role() = 'admin'));

-- distributions: Users can view their own distributions
DROP POLICY IF EXISTS "Users can view their own distributions" ON public.distributions;
CREATE POLICY "Users can view their own distributions"
  ON public.distributions
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING ((beneficiary_id IN (SELECT id FROM beneficiaries WHERE user_id = auth.uid())) OR jwt_role() IN ('admin','waqif','accountant'));

-- expense_budgets: Authorized roles can view expense_budgets
DROP POLICY IF EXISTS "Authorized roles can view expense_budgets" ON public.expense_budgets;
CREATE POLICY "Authorized roles can view expense_budgets"
  ON public.expense_budgets
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('beneficiary','waqif'));

-- expenses: Authorized roles can view expenses
DROP POLICY IF EXISTS "Authorized roles can view expenses" ON public.expenses;
CREATE POLICY "Authorized roles can view expenses"
  ON public.expenses
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif'));

-- fiscal_years: Admins and accountants can view all fiscal_years
DROP POLICY IF EXISTS "Admins and accountants can view all fiscal_years" ON public.fiscal_years;
CREATE POLICY "Admins and accountants can view all fiscal_years"
  ON public.fiscal_years
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','accountant'));

-- fiscal_years: Beneficiaries and waqif can view published fiscal_years
DROP POLICY IF EXISTS "Beneficiaries and waqif can view published fiscal_years" ON public.fiscal_years;
CREATE POLICY "Beneficiaries and waqif can view published fiscal_years"
  ON public.fiscal_years
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((published = true) AND jwt_role() IN ('beneficiary','waqif'));

-- income: Authorized roles can view income
DROP POLICY IF EXISTS "Authorized roles can view income" ON public.income;
CREATE POLICY "Authorized roles can view income"
  ON public.income
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','waqif','beneficiary'));

-- invoice_chain: Accountants can view invoice_chain
DROP POLICY IF EXISTS "Accountants can view invoice_chain" ON public.invoice_chain;
CREATE POLICY "Accountants can view invoice_chain"
  ON public.invoice_chain
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (jwt_role() = 'accountant');

-- invoice_items: Authorized roles can view invoice_items
DROP POLICY IF EXISTS "Authorized roles can view invoice_items" ON public.invoice_items;
CREATE POLICY "Authorized roles can view invoice_items"
  ON public.invoice_items
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif'));

-- invoice_items: Restrict unpublished fiscal year data on invoice_items
DROP POLICY IF EXISTS "Restrict unpublished fiscal year data on invoice_items" ON public.invoice_items;
CREATE POLICY "Restrict unpublished fiscal year data on invoice_items"
  ON public.invoice_items
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (
    jwt_role() IN ('admin','accountant')
    OR (EXISTS (SELECT 1 FROM invoices i WHERE i.id = invoice_items.invoice_id AND invoice_items.invoice_source = 'invoices' AND is_fiscal_year_accessible(i.fiscal_year_id)))
    OR (EXISTS (SELECT 1 FROM payment_invoices pi WHERE pi.id = invoice_items.invoice_id AND invoice_items.invoice_source = 'payment_invoices' AND is_fiscal_year_accessible(pi.fiscal_year_id)))
  );

-- invoices: Authorized roles can view invoices
DROP POLICY IF EXISTS "Authorized roles can view invoices" ON public.invoices;
CREATE POLICY "Authorized roles can view invoices"
  ON public.invoices
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif'));

-- messages: Users can view messages in their conversations
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR jwt_role() = 'admin')));

-- payment_invoices: Authorized roles can view payment_invoices
DROP POLICY IF EXISTS "Authorized roles can view payment_invoices" ON public.payment_invoices;
CREATE POLICY "Authorized roles can view payment_invoices"
  ON public.payment_invoices
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif'));

-- properties: Authorized roles can view properties
DROP POLICY IF EXISTS "Authorized roles can view properties" ON public.properties;
CREATE POLICY "Authorized roles can view properties"
  ON public.properties
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','beneficiary','waqif'));

-- support_ticket_replies: Accountants can view non-internal replies
DROP POLICY IF EXISTS "Accountants can view non-internal replies" ON public.support_ticket_replies;
CREATE POLICY "Accountants can view non-internal replies"
  ON public.support_ticket_replies
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() = 'accountant' AND is_internal = false);

-- support_tickets: Accountants can view all tickets
DROP POLICY IF EXISTS "Accountants can view all tickets" ON public.support_tickets;
CREATE POLICY "Accountants can view all tickets"
  ON public.support_tickets
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() = 'accountant');

-- tenant_payments: Admin and accountant can view tenant_payments
DROP POLICY IF EXISTS "Admin and accountant can view tenant_payments" ON public.tenant_payments;
CREATE POLICY "Admin and accountant can view tenant_payments"
  ON public.tenant_payments
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','accountant'));

-- units: Authorized roles can view units
DROP POLICY IF EXISTS "Authorized roles can view units" ON public.units;
CREATE POLICY "Authorized roles can view units"
  ON public.units
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() IN ('admin','waqif','beneficiary'));

-- waqf_bylaws: Authorized roles can view bylaws
DROP POLICY IF EXISTS "Authorized roles can view bylaws" ON public.waqf_bylaws;
CREATE POLICY "Authorized roles can view bylaws"
  ON public.waqf_bylaws
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING ((jwt_role() = 'admin') OR (jwt_role() IN ('beneficiary','waqif','accountant') AND is_visible = true));

-- webauthn_credentials: Admins can view all webauthn credentials
DROP POLICY IF EXISTS "Admins can view all webauthn credentials" ON public.webauthn_credentials;
CREATE POLICY "Admins can view all webauthn credentials"
  ON public.webauthn_credentials
  AS PERMISSIVE
  FOR SELECT
  TO public
  USING (jwt_role() = 'admin');

-- zatca_operation_log: Admins can view zatca_operation_log
DROP POLICY IF EXISTS "Admins can view zatca_operation_log" ON public.zatca_operation_log;
CREATE POLICY "Admins can view zatca_operation_log"
  ON public.zatca_operation_log
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (jwt_role() = 'admin');

-- ═══════════════════════════════════════════════════════════
-- فهارس FK المفقودة
-- ═══════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_account_categories_parent_id ON public.account_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);

-- ═══════════════════════════════════════════════════════════
-- عرض ملخص مالي لكل سنة مالية
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_fiscal_year_summary
WITH (security_barrier = true)
AS
SELECT
  fy.id AS fiscal_year_id,
  fy.label,
  fy.status,
  fy.start_date,
  fy.end_date,
  COALESCE(inc.total_income, 0) AS total_income,
  COALESCE(inc.income_count, 0)::int AS income_count,
  COALESCE(exp.total_expenses, 0) AS total_expenses,
  COALESCE(exp.expense_count, 0)::int AS expense_count,
  COALESCE(inc.total_income, 0) - COALESCE(exp.total_expenses, 0) AS net_balance,
  COALESCE(dist.total_distributed, 0) AS total_distributed,
  COALESCE(dist.distribution_count, 0)::int AS distribution_count,
  COALESCE(pi_s.total_invoiced, 0) AS total_invoiced,
  COALESCE(pi_s.paid_invoices, 0)::int AS paid_invoices,
  COALESCE(pi_s.pending_invoices, 0)::int AS pending_invoices
FROM public.fiscal_years fy
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS total_income, COUNT(*) AS income_count
  FROM public.income WHERE fiscal_year_id = fy.id
) inc ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS total_expenses, COUNT(*) AS expense_count
  FROM public.expenses WHERE fiscal_year_id = fy.id
) exp ON true
LEFT JOIN LATERAL (
  SELECT SUM(amount) AS total_distributed, COUNT(*) AS distribution_count
  FROM public.distributions WHERE fiscal_year_id = fy.id
) dist ON true
LEFT JOIN LATERAL (
  SELECT 
    SUM(amount) AS total_invoiced,
    COUNT(*) FILTER (WHERE status = 'paid') AS paid_invoices,
    COUNT(*) FILTER (WHERE status = 'pending') AS pending_invoices
  FROM public.payment_invoices WHERE fiscal_year_id = fy.id
) pi_s ON true;

-- ═══════════════════════════════════════════════════════════
-- دالة مؤشرات الأداء — تُحسب server-side بدلاً من المتصفح
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_dashboard_kpis(p_fiscal_year_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fy_id uuid;
  v_result jsonb;
BEGIN
  -- التحقق من الصلاحية
  IF NOT (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'accountant')
  ) THEN
    RAISE EXCEPTION 'غير مصرح';
  END IF;

  -- تحديد السنة المالية (النشطة إن لم تُحدد)
  IF p_fiscal_year_id IS NOT NULL THEN
    v_fy_id := p_fiscal_year_id;
  ELSE
    SELECT id INTO v_fy_id FROM fiscal_years WHERE status = 'active' LIMIT 1;
  END IF;

  IF v_fy_id IS NULL THEN
    RETURN '{}'::jsonb;
  END IF;

  SELECT jsonb_build_object(
    'fiscal_year_id', v_fy_id,
    'total_income', COALESCE(SUM(i.amount), 0),
    'income_count', COUNT(DISTINCT i.id),
    'total_expenses', (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE fiscal_year_id = v_fy_id),
    'expense_count', (SELECT COUNT(*) FROM expenses WHERE fiscal_year_id = v_fy_id),
    'net_balance', COALESCE(SUM(i.amount), 0) - (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE fiscal_year_id = v_fy_id),
    'total_distributed', (SELECT COALESCE(SUM(amount), 0) FROM distributions WHERE fiscal_year_id = v_fy_id),
    'active_contracts', (SELECT COUNT(*) FROM contracts WHERE status = 'active'),
    'total_properties', (SELECT COUNT(*) FROM properties),
    'total_beneficiaries', (SELECT COUNT(*) FROM beneficiaries),
    'collection_rate', CASE 
      WHEN (SELECT COUNT(*) FROM payment_invoices WHERE fiscal_year_id = v_fy_id) > 0
      THEN ROUND(
        (SELECT COUNT(*)::numeric FROM payment_invoices WHERE fiscal_year_id = v_fy_id AND status = 'paid') /
        (SELECT COUNT(*)::numeric FROM payment_invoices WHERE fiscal_year_id = v_fy_id) * 100, 1
      )
      ELSE 0
    END,
    'overdue_invoices', (SELECT COUNT(*) FROM payment_invoices WHERE fiscal_year_id = v_fy_id AND status = 'overdue'),
    'pending_advance_requests', (SELECT COUNT(*) FROM advance_requests WHERE status = 'pending')
  ) INTO v_result
  FROM income i
  WHERE i.fiscal_year_id = v_fy_id;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$;