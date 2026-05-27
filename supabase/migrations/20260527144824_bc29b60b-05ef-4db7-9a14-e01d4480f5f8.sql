BEGIN;

-- Harden disbursement_vouchers_public without touching contracts_safe, which is intentionally security-definer for PII masking.
CREATE OR REPLACE VIEW public.disbursement_vouchers_public
WITH (security_invoker = true) AS
SELECT
  id,
  voucher_number,
  expense_id,
  fiscal_year_id,
  recipient_name,
  amount,
  payment_method,
  work_description,
  status,
  approved_at,
  created_at,
  pdf_path
FROM public.disbursement_vouchers
WHERE status = 'approved'::voucher_status
  AND public.is_fiscal_year_accessible(fiscal_year_id)
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
  );

REVOKE ALL ON TABLE public.disbursement_vouchers_public FROM PUBLIC;
REVOKE ALL ON TABLE public.disbursement_vouchers_public FROM anon;
GRANT SELECT ON TABLE public.disbursement_vouchers_public TO authenticated;
GRANT SELECT ON TABLE public.disbursement_vouchers_public TO service_role;

COMMENT ON VIEW public.disbursement_vouchers_public IS
  'Security-invoker approved-voucher view. It relies on the caller role and exposes only non-PII voucher fields to authenticated operational roles.';

-- Revoke anonymous execution from SECURITY DEFINER functions unless explicitly public.
DO $$
DECLARE
  fn record;
  signature text;
  public_signatures text[] := ARRAY[
    'public.get_public_stats()',
    'public.log_access_event(p_event_type text, p_email text, p_user_id uuid, p_target_path text, p_device_info text, p_metadata jsonb)'
  ];
  authenticated_function_names text[] := ARRAY[
    'approve_disbursement_voucher',
    'clear_zatca_otp',
    'close_fiscal_year',
    'create_disbursement_voucher',
    'cron_check_late_payments',
    'execute_distribution',
    'generate_all_active_invoices',
    'generate_contract_invoices',
    'generate_voucher_number',
    'get_beneficiary_dashboard',
    'get_dashboard_full_summary',
    'get_dashboard_kpis',
    'get_expense_summary_by_type',
    'get_income_summary_by_source',
    'get_max_advance_amount',
    'get_multi_year_summary',
    'get_public_stats',
    'get_support_analytics',
    'get_support_stats',
    'get_total_beneficiary_percentage',
    'get_year_comparison_summary',
    'has_role',
    'is_fiscal_year_accessible',
    'log_access_event',
    'notify_admins',
    'notify_all_beneficiaries',
    'pay_invoice_and_record_collection',
    'rate_support_ticket',
    'reopen_fiscal_year',
    'reorder_bylaws',
    'sync_property_contract_invoice_vat',
    'unpay_invoice_and_revert_collection',
    'upsert_contract_allocations',
    'upsert_tenant_payment',
    'void_disbursement_voucher'
  ];
BEGIN
  FOR fn IN
    SELECT
      p.oid,
      n.nspname,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    signature := format('%I.%I(%s)', fn.nspname, fn.proname, fn.args);

    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', signature);

    IF signature = ANY(public_signatures) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon', signature);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    ELSIF fn.proname = ANY(authenticated_function_names) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', signature);
    ELSE
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', signature);
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.get_public_stats() IS
  '[anon-callable] Public landing-page stats. Output is controlled by app_settings and never exposes private records directly.';

COMMENT ON FUNCTION public.log_access_event(text, text, uuid, text, text, jsonb) IS
  '[anon-callable] Pre-auth access/error telemetry writer. User-facing roles cannot read access_log.';

COMMIT;