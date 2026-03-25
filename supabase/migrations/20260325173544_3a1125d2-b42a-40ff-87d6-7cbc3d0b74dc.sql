
CREATE OR REPLACE FUNCTION public.log_access_event(
  p_event_type text,
  p_email text DEFAULT NULL,
  p_user_id text DEFAULT NULL,
  p_target_path text DEFAULT NULL,
  p_device_info text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_type NOT IN (
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch',
    'client_error','diagnostics_run'
  ) THEN
    RAISE EXCEPTION 'نوع حدث غير صالح: %', p_event_type;
  END IF;

  INSERT INTO public.access_log (event_type, email, user_id, target_path, device_info, metadata)
  VALUES (
    p_event_type,
    LEFT(p_email, 320),
    p_user_id,
    LEFT(p_target_path, 1000),
    LEFT(p_device_info, 500),
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;
