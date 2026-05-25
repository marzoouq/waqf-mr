-- 1) CHECK constraint على event_type (Defense-in-Depth)
ALTER TABLE public.access_log
  DROP CONSTRAINT IF EXISTS access_log_event_type_check;

ALTER TABLE public.access_log
  ADD CONSTRAINT access_log_event_type_check
  CHECK (event_type IN (
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch','client_error'
  ));

-- 2) تحديث الدالة لإضافة قص الحقول النصية
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL::text,
  p_user_id uuid DEFAULT NULL::uuid,
  p_target_path text DEFAULT NULL::text,
  p_device_info text DEFAULT NULL::text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_caller uuid;
BEGIN
  -- التحقق من نوع الحدث
  IF p_event_type NOT IN (
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch','client_error'
  ) THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;

  -- الحصول على هوية المستدعي الفعلية
  v_caller := auth.uid();

  -- منع انتحال الهوية
  IF p_user_id IS NOT NULL AND v_caller IS NOT NULL AND p_user_id != v_caller THEN
    RAISE EXCEPTION 'لا يمكن تسجيل حدث باسم مستخدم آخر';
  END IF;

  -- قص الحقول النصية لمنع تضخم السجل
  INSERT INTO public.access_log (
    event_type, email, user_id, target_path, device_info, metadata
  ) VALUES (
    p_event_type,
    LEFT(p_email, 320),
    COALESCE(v_caller, p_user_id),
    LEFT(p_target_path, 500),
    LEFT(p_device_info, 500),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$function$;