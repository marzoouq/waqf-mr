-- ============================================================
-- R9 — حذف فهارس مكررة
-- ============================================================
DROP INDEX IF EXISTS public.idx_accounts_fiscal_year_id;
DROP INDEX IF EXISTS public.idx_audit_log_table_date;
DROP INDEX IF EXISTS public.idx_unsubscribe_tokens_token;
DROP INDEX IF EXISTS public.idx_notifications_user_read;
DROP INDEX IF EXISTS public.idx_messages_conversation;
ALTER TABLE public.rate_limits DROP CONSTRAINT IF EXISTS rate_limits_key_key;

-- ============================================================
-- R9 — GRANTs صريحة على 42 جدول public (defence-in-depth)
-- ============================================================
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'access_log','access_log_archive','account_categories','accounts',
    'advance_carryforward','advance_requests','annual_report_items','annual_report_status',
    'app_settings','audit_log','beneficiaries','contract_fiscal_allocations',
    'contracts','conversations','disbursement_vouchers','distributions',
    'email_send_log','email_send_state','email_unsubscribe_tokens','expense_budgets',
    'expenses','fiscal_years','income','invoice_chain',
    'invoice_items','invoices','messages','notifications',
    'payment_invoices','properties','rate_limits','support_ticket_replies',
    'support_tickets','suppressed_emails','tenant_payments','units',
    'user_roles','waqf_bylaws','webauthn_challenges','webauthn_credentials',
    'zatca_certificates','zatca_operation_log'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl);
  END LOOP;
END $$;