CREATE OR REPLACE FUNCTION public.html_escape(p text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT replace(replace(replace(replace(replace(coalesce(p,''),'&','&amp;'),'<','&lt;'),'>','&gt;'),'"','&quot;'),'''','&#39;')
$$;
CREATE OR REPLACE FUNCTION public.detect_error_alerts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  v_msg text;
  v_count integer;
  v_incident public.alert_incidents;
  v_now timestamptz := now();
  v_recipient text;
  v_subject text;
  v_html text;
BEGIN
  IF NEW.event_type NOT IN ('client_error', 'login_failed', 'unauthorized_access') THEN
    RETURN NEW;
  END IF;

  v_msg := coalesce(NEW.metadata->>'error_message', NEW.metadata->>'message', '');

  IF v_msg ILIKE 'Test %' THEN
    RETURN NEW;
  END IF;

  FOR r IN
    SELECT * FROM public.alert_rules
    WHERE is_active = true AND event_type = NEW.event_type
  LOOP
    BEGIN
      IF r.match_pattern IS NOT NULL AND v_msg NOT ILIKE r.match_pattern THEN
        CONTINUE;
      END IF;

      SELECT count(*) INTO v_count
      FROM public.access_log al
      WHERE al.event_type = r.event_type
        AND al.created_at >= v_now - make_interval(mins => r.window_minutes)
        AND (
          r.match_pattern IS NULL
          OR coalesce(al.metadata->>'error_message', al.metadata->>'message', '') ILIKE r.match_pattern
        );

      IF v_count < r.threshold_count THEN
        CONTINUE;
      END IF;

      SELECT * INTO v_incident
      FROM public.alert_incidents
      WHERE rule_code = r.code
        AND status <> 'resolved'
        AND last_seen_at >= v_now - make_interval(mins => r.window_minutes)
      ORDER BY last_seen_at DESC
      LIMIT 1;

      IF v_incident.id IS NULL THEN
        INSERT INTO public.alert_incidents (
          rule_code, severity, title, summary, occurrences, target_path, sample_metadata,
          first_seen_at, last_seen_at
        ) VALUES (
          r.code, r.severity, r.name,
          left(coalesce(nullif(v_msg, ''), 'بدون رسالة'), 300),
          v_count, NEW.target_path,
          jsonb_build_object(
            'event_type', NEW.event_type,
            'error_message', left(v_msg, 300),
            'session_id', NEW.session_id,
            'ip_address', NEW.ip_address,
            'user_id', NEW.user_id,
            'alert_category', NEW.metadata->>'alert_category'
          ),
          v_now, v_now
        )
        RETURNING * INTO v_incident;
      ELSE
        UPDATE public.alert_incidents
        SET occurrences = occurrences + 1,
            last_seen_at = v_now,
            target_path = coalesce(NEW.target_path, target_path),
            summary = left(coalesce(nullif(v_msg, ''), summary), 300)
        WHERE id = v_incident.id
        RETURNING * INTO v_incident;
      END IF;

      IF v_incident.notified_at IS NOT NULL
         AND v_incident.notified_at > v_now - make_interval(mins => r.cooldown_minutes) THEN
        CONTINUE;
      END IF;

      IF r.notify_in_app THEN
        PERFORM public.notify_ops(
          '⚠️ تنبيه: ' || r.name,
          'عدد الحالات خلال ' || r.window_minutes || ' دقيقة: ' || v_count ||
          coalesce(' — المسار: ' || NEW.target_path, '') ||
          coalesce(' — الرسالة: ' || left(nullif(v_msg, ''), 200), ''),
          CASE WHEN r.severity = 'critical' THEN 'error' ELSE 'warning' END,
          '/dashboard/system-diagnostics'
        );
      END IF;

      IF r.notify_email THEN
        v_subject := '[تنبيه ' || CASE WHEN r.severity = 'critical' THEN 'حرج' ELSE 'تحذيري' END || '] ' || r.name;
        v_html :=
          '<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;padding:16px">' ||
          '<h2 style="margin:0 0 12px">' || public.html_escape(r.name) || '</h2>' ||
          '<p>تم رصد ' || v_count || ' حالة خلال ' || r.window_minutes || ' دقيقة.</p>' ||
          '<p>المسار: ' || public.html_escape(coalesce(NEW.target_path, 'غير معروف')) || '</p>' ||
          '<p>الرسالة: ' || public.html_escape(coalesce(left(nullif(v_msg, ''), 300), 'بدون رسالة')) || '</p>' ||
          '<p>راجع مركز تشخيص النظام &gt; تبويب التنبيهات.</p></div>';

        FOR v_recipient IN
          SELECT u.email
          FROM auth.users u
          JOIN public.user_roles ur ON ur.user_id = u.id
          WHERE ur.role IN ('admin', 'support') AND u.email IS NOT NULL
          LIMIT 10
        LOOP
          PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
            'message_id', gen_random_uuid()::text,
            'to', v_recipient,
            'from', 'وقف مرزوق بن علي الثبيتي <noreply@waqf-wise.net>',
            'sender_domain', 'notify.waqf-wise.net',
            'subject', v_subject,
            'html', v_html,
            'purpose', 'transactional',
            'label', 'system_alert',
            'idempotency_key', 'alert-' || v_incident.id::text || '-' || v_incident.occurrences::text,
            'queued_at', v_now
          ));
        END LOOP;
      END IF;

      UPDATE public.alert_incidents SET notified_at = v_now WHERE id = v_incident.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'detect_error_alerts failed for rule %: %', r.code, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;