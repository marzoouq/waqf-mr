DO $$
DECLARE
  sig text;
  sigs text[] := ARRAY[
    'public.audit_app_settings_trigger()',
    'public.audit_trigger_func()',
    'public.encrypt_beneficiary_pii()',
    'public.encrypt_zatca_private_key()',
    'public.enforce_single_active_fy()',
    'public.prevent_category_circular_ref()',
    'public.prevent_closed_fiscal_year_modification()',
    'public.prevent_fiscal_year_overlap()',
    'public.prevent_issued_invoice_modification()',
    'public.set_distribution_fiscal_year()',
    'public.sync_role_to_auth_meta()',
    'public.sync_unit_status_on_contract_change()',
    'public.update_support_ticket_timestamp()',
    'public.update_updated_at_column()',
    'public.validate_advance_request_amount()',
    'public.validate_advance_status_transition()',
    'public.validate_app_settings_value()',
    'public.validate_category_type()',
    'public.validate_conversation_type()',
    'public.validate_invoice_chain_reference()',
    'public.validate_invoice_vat()',
    'public.validate_payment_invoice_vat()',
    'public.validate_polymorphic_invoice_item_ref()',
    'public.validate_reply_content()',
    'public.validate_support_ticket()',
    'public.validate_ticket_rating()',
    'public.validate_zatca_certificate_activation()'
  ];
BEGIN
  FOREACH sig IN ARRAY sigs LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', sig);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO postgres', sig);
    EXECUTE format('GRANT  EXECUTE ON FUNCTION %s TO service_role', sig);
    EXECUTE format($cmt$COMMENT ON FUNCTION %s IS 'Internal trigger function; EXECUTE revoked from public roles (Migration #2).'$cmt$, sig);
  END LOOP;
END$$;