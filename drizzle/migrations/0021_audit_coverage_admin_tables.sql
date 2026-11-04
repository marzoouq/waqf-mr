-- تقنيع الأسرار في سجل المراجعة للجداول الحساسة
CREATE OR REPLACE FUNCTION public.mask_audit_fields(p_data jsonb, p_table_name text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE
  v_fields text[];
  v_field text;
BEGIN
  IF p_data IS NULL THEN RETURN NULL; END IF;
  IF p_table_name IN ('support_tickets', 'support_ticket_replies', 'messages', 'conversations') THEN
    v_fields := ARRAY['notes', 'description', 'resolution_notes', 'rating_comment', 'content'];
  ELSIF p_table_name = 'zatca_certificates' THEN
    v_fields := ARRAY['certificate', 'private_key', 'zatca_secret'];
  ELSIF p_table_name = 'webauthn_credentials' THEN
    v_fields := ARRAY['public_key', 'credential_id'];
  ELSE
    v_fields := ARRAY['resolution_notes', 'rating_comment'];
  END IF;
  FOREACH v_field IN ARRAY v_fields LOOP
    IF p_data ? v_field AND p_data->>v_field IS NOT NULL AND length(p_data->>v_field) > 0 THEN
      p_data := jsonb_set(p_data, ARRAY[v_field], '"[مُقنَّع]"'::jsonb);
    END IF;
  END LOOP;
  RETURN p_data;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_roles','file_access_rules','file_access_grants','file_category_rules',
    'account_categories','expense_budgets','annual_report_items','annual_report_status',
    'contract_fiscal_allocations','tenant_payments','official_letters',
    'webauthn_credentials','zatca_certificates','blocked_ips','alert_rules','archived_documents'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func()', t);
  END LOOP;
END $$;

-- عرض المنفّذ ودوره لسجل المراجعة (للناظر فقط)
CREATE OR REPLACE FUNCTION public.audit_log_actors(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, email text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT u.id, u.email::text,
    (SELECT r.role::text FROM public.user_roles r WHERE r.user_id = u.id
      ORDER BY CASE r.role WHEN 'admin' THEN 1 WHEN 'accountant' THEN 2 ELSE 3 END LIMIT 1)
  FROM auth.users u
  WHERE u.id = ANY(p_user_ids)
    AND (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'accountant'::app_role));
$$;
REVOKE ALL ON FUNCTION public.audit_log_actors(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.audit_log_actors(uuid[]) TO authenticated;