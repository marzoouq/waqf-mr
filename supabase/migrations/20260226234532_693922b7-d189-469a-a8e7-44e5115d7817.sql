
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_target_path text DEFAULT NULL,
  p_device_info text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_caller uuid;
BEGIN
  -- الحصول على هوية المستدعي الفعلية
  v_caller := auth.uid();

  -- إذا تم تمرير p_user_id يجب أن يطابق المستدعي الفعلي (منع انتحال الهوية)
  IF p_user_id IS NOT NULL AND v_caller IS NOT NULL AND p_user_id != v_caller THEN
    RAISE EXCEPTION 'لا يمكن تسجيل حدث باسم مستخدم آخر';
  END IF;

  INSERT INTO public.access_log (
    event_type, email, user_id, target_path, device_info, metadata
  ) VALUES (
    p_event_type,
    p_email,
    COALESCE(v_caller, p_user_id),
    p_target_path,
    p_device_info,
    p_metadata
  );
END;
$$;
