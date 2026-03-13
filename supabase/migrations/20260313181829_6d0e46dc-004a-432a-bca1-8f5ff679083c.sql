
-- ============================================================
-- إصلاح أمني حرج: سحب صلاحيات EXECUTE من anon و PUBLIC
-- لجميع الدوال الحساسة ومنحها لـ authenticated فقط
-- ============================================================

-- === 1. دوال التشفير (حرج جداً) ===
REVOKE EXECUTE ON FUNCTION public.get_pii_key() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrypt_pii(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.encrypt_pii(text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.lookup_by_national_id(text) FROM anon, PUBLIC;

-- === 2. دوال ZATCA ===
REVOKE EXECUTE ON FUNCTION public.get_active_zatca_certificate() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_next_icv() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.allocate_icv_and_chain(uuid, text) FROM anon, PUBLIC;

-- === 3. دوال مالية ===
REVOKE EXECUTE ON FUNCTION public.close_fiscal_year(uuid, jsonb, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reopen_fiscal_year(uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.execute_distribution(uuid, uuid, numeric, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.pay_invoice_and_record_collection(uuid, numeric) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_total_beneficiary_percentage() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_max_advance_amount(uuid, uuid) FROM anon, PUBLIC;

-- === 4. دوال إدارية ===
REVOKE EXECUTE ON FUNCTION public.reorder_bylaws(jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_tenant_payment(uuid, integer, text, numeric, uuid, uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.upsert_contract_allocations(uuid, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_all_active_invoices() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_challenges() FROM anon, PUBLIC;

-- === 5. دوال الإشعارات ===
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) FROM anon, PUBLIC;

-- === 6. دوال cron ===
REVOKE EXECUTE ON FUNCTION public.cron_auto_expire_contracts() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_check_contract_expiry() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_old_notifications() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_archive_old_access_logs() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_update_overdue_invoices() FROM anon, PUBLIC;

-- ============================================================
-- منح EXECUTE لـ authenticated فقط (ما عدا lookup و cron)
-- ============================================================

GRANT EXECUTE ON FUNCTION public.get_pii_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decrypt_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.encrypt_pii(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_beneficiary_decrypted(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_zatca_certificate() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_icv() TO authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_icv_and_chain(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_fiscal_year(uuid, jsonb, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reopen_fiscal_year(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_distribution(uuid, uuid, numeric, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pay_invoice_and_record_collection(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpay_invoice_and_revert_collection(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_beneficiary_percentage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_max_advance_amount(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_bylaws(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_tenant_payment(uuid, integer, text, numeric, uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_contract_allocations(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_all_active_invoices() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_challenges() TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) TO authenticated;

-- lookup_by_national_id: لا GRANT — تُستدعى فقط من Edge Function عبر service_role
-- cron functions: لا GRANT — تُنفذ من pg_cron بصلاحيات postgres
-- الدوال المستثناة (تبقى لـ anon): get_public_stats, has_role, is_fiscal_year_accessible, log_access_event, check_rate_limit, trigger functions
