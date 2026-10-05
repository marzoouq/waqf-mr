-- تثبيت صريح للصلاحيات القائمة فعلاً (لا تغيير في السلوك؛ RLS يبقى الحاكم). لا لمس للبيانات.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['access_log','access_log_archive','account_categories','accounts','advance_carryforward','advance_requests','ai_chat_sessions','annual_report_items','annual_report_status','app_settings','audit_log','contract_fiscal_allocations','conversations','disbursement_vouchers','distributions','email_send_log','email_send_state','email_unsubscribe_tokens','expense_budgets','expenses','fiscal_years','income','invoice_chain','invoice_items','invoices','messages','notifications','payment_invoices','properties','rate_limits','support_ticket_replies','support_tickets','suppressed_emails','tenant_payments','units','waqf_bylaws','webauthn_challenges','webauthn_credentials','zatca_certificates','zatca_operation_log']
  LOOP
    IF to_regclass('public.'||t) IS NOT NULL THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
      EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    END IF;
  END LOOP;
END $$;