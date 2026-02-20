
-- Update log_access_event to allow 'role_fetch' event type for diagnostics
CREATE OR REPLACE FUNCTION public.log_access_event(p_event_type text, p_email text DEFAULT NULL::text, p_user_id uuid DEFAULT NULL::uuid, p_target_path text DEFAULT NULL::text, p_ip_info text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_role TEXT;
  allowed_anon_events TEXT[] := ARRAY['login_failed', 'login_success', 'signup_attempt'];
BEGIN
  IF p_event_type IS NULL OR length(trim(p_event_type)) = 0 THEN
    RAISE EXCEPTION 'نوع الحدث مطلوب';
  END IF;
  IF p_event_type NOT IN ('login_success', 'login_failed', 'logout', 'idle_logout', 'unauthorized_access', 'signup_attempt', 'role_fetch') THEN
    RAISE EXCEPTION 'نوع حدث غير صالح';
  END IF;

  caller_role := current_setting('request.jwt.claims', true)::jsonb ->> 'role';
  
  IF (caller_role IS NULL OR caller_role = 'anon') THEN
    IF NOT (p_event_type = ANY(allowed_anon_events)) THEN
      RAISE EXCEPTION 'غير مصرح بهذا النوع من الأحداث';
    END IF;
    IF p_user_id IS NOT NULL THEN
      p_user_id := NULL;
    END IF;
  END IF;

  IF p_email IS NOT NULL AND length(p_email) > 320 THEN
    RAISE EXCEPTION 'البريد الإلكتروني طويل جداً';
  END IF;
  IF p_target_path IS NOT NULL AND length(p_target_path) > 500 THEN
    RAISE EXCEPTION 'المسار طويل جداً';
  END IF;
  IF p_ip_info IS NOT NULL AND length(p_ip_info) > 500 THEN
    p_ip_info := left(p_ip_info, 500);
  END IF;

  INSERT INTO public.access_log (event_type, email, user_id, target_path, ip_info, metadata)
  VALUES (p_event_type, p_email, p_user_id, p_target_path, p_ip_info, p_metadata);
END;
$function$;
