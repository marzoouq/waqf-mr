ALTER TABLE public.access_log DROP CONSTRAINT IF EXISTS access_log_event_type_check;
ALTER TABLE public.access_log ADD CONSTRAINT access_log_event_type_check
  CHECK (event_type = ANY (ARRAY[
    'login_success','login_failed','logout','idle_logout',
    'unauthorized_access','signup_attempt','role_fetch','client_error',
    'diagnostics_run'
  ]));