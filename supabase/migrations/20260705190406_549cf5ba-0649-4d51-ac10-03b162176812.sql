CREATE OR REPLACE FUNCTION public.email_queue_dispatch()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_service_key text;
  v_payload text;
  v_payload_json jsonb;
  v_project_ref text;
  v_padding int;
  v_function_url text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
     AND NOT EXISTS (SELECT 1 FROM pgmq.q_transactional_emails) THEN
    BEGIN
      PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000001);
      IF EXISTS (SELECT 1 FROM pgmq.q_auth_emails)
         OR EXISTS (SELECT 1 FROM pgmq.q_transactional_emails) THEN
        RETURN;
      END IF;
      PERFORM cron.unschedule('process-email-queue');
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_dispatch: cron unschedule failed: %', SQLERRM;
    END;
    RETURN;
  END IF;

  IF (SELECT retry_after_until FROM public.email_send_state WHERE id = 1) > now() THEN
    RETURN;
  END IF;

  SELECT decrypted_secret
  INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'email_queue_service_role_key'
  LIMIT 1;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RAISE WARNING 'email_queue_dispatch: missing email queue service key';
    RETURN;
  END IF;

  v_payload := split_part(v_service_key, '.', 2);
  v_payload := replace(replace(v_payload, '-', '+'), '_', '/');
  v_padding := (4 - length(v_payload) % 4) % 4;
  v_payload := v_payload || repeat('=', v_padding);

  BEGIN
    v_payload_json := convert_from(decode(v_payload, 'base64'), 'UTF8')::jsonb;
    v_project_ref := v_payload_json ->> 'ref';
  EXCEPTION WHEN OTHERS THEN
    v_project_ref := NULL;
  END;

  IF v_project_ref IS NULL OR v_project_ref = '' THEN
    RAISE WARNING 'email_queue_dispatch: could not resolve project ref from service key';
    RETURN;
  END IF;

  v_function_url := 'https://' || v_project_ref || '.supabase.co/functions/v1/process-email-queue';

  PERFORM net.http_post(
    url := v_function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Lovable-Context', 'cron',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := '{}'::jsonb
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.email_queue_wake()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(7700000000000001);

  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
    BEGIN
      PERFORM cron.schedule(
        'process-email-queue',
        '5 seconds',
        $cron$ SELECT public.email_queue_dispatch(); $cron$
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'email_queue_wake: cron schedule failed: %', SQLERRM;
    END;
  END IF;

  BEGIN
    PERFORM public.email_queue_dispatch();
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'email_queue_wake failed (enqueue preserved): %', SQLERRM;
  RETURN NULL;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_dispatch() TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_wake() TO service_role;