CREATE OR REPLACE FUNCTION public.clear_client_error_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted integer := 0;
  v_resolved integer := 0;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role(v_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'غير مصرح' USING ERRCODE = '42501';
  END IF;

  -- يحذف أخطاء الواجهة فقط؛ سجلات الدخول والتصفح تبقى
  DELETE FROM public.access_log WHERE event_type = 'client_error';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  -- الحوادث تُعلَّم محلولة ولا تُحذف
  UPDATE public.alert_incidents
     SET status = 'resolved', resolved_by = v_uid, resolved_at = now(), updated_at = now()
   WHERE status IN ('open', 'acknowledged');
  GET DIAGNOSTICS v_resolved = ROW_COUNT;

  INSERT INTO public.audit_log (table_name, operation, user_id, new_data)
  VALUES ('access_log', 'CLEAR_CLIENT_ERRORS', v_uid,
          jsonb_build_object('deleted_client_errors', v_deleted, 'resolved_incidents', v_resolved));

  RETURN jsonb_build_object('deleted', v_deleted, 'resolved', v_resolved);
END;
$$;

REVOKE ALL ON FUNCTION public.clear_client_error_logs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_client_error_logs() TO authenticated;