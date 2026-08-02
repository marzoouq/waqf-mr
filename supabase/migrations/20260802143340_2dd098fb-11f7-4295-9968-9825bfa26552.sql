-- ═══════════════════════════════════════════════════════════════════════
-- منظومة تنبيهات أخطاء Realtime والأخطاء الحرجة
-- ═══════════════════════════════════════════════════════════════════════

-- 1) جدول قواعد التنبيه
CREATE TABLE public.alert_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  event_type text NOT NULL DEFAULT 'client_error',
  match_pattern text,
  severity text NOT NULL DEFAULT 'warning',
  threshold_count integer NOT NULL DEFAULT 1,
  window_minutes integer NOT NULL DEFAULT 10,
  cooldown_minutes integer NOT NULL DEFAULT 30,
  notify_in_app boolean NOT NULL DEFAULT true,
  notify_email boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alert_rules_severity_check CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT alert_rules_threshold_check CHECK (threshold_count > 0 AND threshold_count <= 1000),
  CONSTRAINT alert_rules_window_check CHECK (window_minutes > 0 AND window_minutes <= 1440),
  CONSTRAINT alert_rules_cooldown_check CHECK (cooldown_minutes >= 0 AND cooldown_minutes <= 1440)
);

GRANT SELECT, UPDATE ON public.alert_rules TO authenticated;
GRANT ALL ON public.alert_rules TO service_role;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_rules_select_ops" ON public.alert_rules
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "alert_rules_update_ops" ON public.alert_rules
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER update_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) جدول حوادث التنبيه
CREATE TABLE public.alert_incidents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_code text NOT NULL REFERENCES public.alert_rules(code) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'warning',
  title text NOT NULL,
  summary text NOT NULL DEFAULT '',
  occurrences integer NOT NULL DEFAULT 1,
  target_path text,
  sample_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  notified_at timestamptz,
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT alert_incidents_severity_check CHECK (severity IN ('info', 'warning', 'critical')),
  CONSTRAINT alert_incidents_status_check CHECK (status IN ('open', 'acknowledged', 'resolved'))
);

CREATE INDEX idx_alert_incidents_status ON public.alert_incidents (status, last_seen_at DESC);
CREATE INDEX idx_alert_incidents_rule ON public.alert_incidents (rule_code, last_seen_at DESC);

GRANT SELECT, UPDATE ON public.alert_incidents TO authenticated;
GRANT ALL ON public.alert_incidents TO service_role;
ALTER TABLE public.alert_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_incidents_select_ops" ON public.alert_incidents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE POLICY "alert_incidents_update_ops" ON public.alert_incidents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support'));

CREATE TRIGGER update_alert_incidents_updated_at
  BEFORE UPDATE ON public.alert_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) إشعار فريق التشغيل (الناظر + الدعم) — للاستخدام الداخلي من المشغّلات فقط
CREATE OR REPLACE FUNCTION public.notify_ops(
  p_title text,
  p_message text,
  p_type text DEFAULT 'warning',
  p_link text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_title IS NULL OR length(trim(p_title)) = 0 THEN
    RAISE EXCEPTION 'العنوان مطلوب';
  END IF;
  IF p_type NOT IN ('info', 'warning', 'error', 'success') THEN
    RAISE EXCEPTION 'نوع إشعار غير صالح';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT ur.user_id, left(p_title, 200), left(coalesce(p_message, ''), 2000), p_type, left(p_link, 500)
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'support');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_ops(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_ops(text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_ops(text, text, text, text) TO service_role;

-- 4) الرصد التلقائي على access_log
CREATE OR REPLACE FUNCTION public.detect_error_alerts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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

  -- استثناء رسائل الاختبار من التنبيهات
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

      -- تهدئة الإشعارات
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
          '<h2 style="margin:0 0 12px">' || r.name || '</h2>' ||
          '<p>تم رصد ' || v_count || ' حالة خلال ' || r.window_minutes || ' دقيقة.</p>' ||
          '<p>المسار: ' || coalesce(NEW.target_path, 'غير معروف') || '</p>' ||
          '<p>الرسالة: ' || coalesce(left(nullif(v_msg, ''), 300), 'بدون رسالة') || '</p>' ||
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
      -- التنبيهات لا يجوز أن تُفشل تسجيل الحدث الأصلي
      RAISE WARNING 'detect_error_alerts failed for rule %: %', r.code, SQLERRM;
    END;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_detect_error_alerts
  AFTER INSERT ON public.access_log
  FOR EACH ROW EXECUTE FUNCTION public.detect_error_alerts();

-- 5) القواعد الافتراضية
INSERT INTO public.alert_rules (code, name, event_type, match_pattern, severity, threshold_count, window_minutes, cooldown_minutes, notify_in_app, notify_email) VALUES
  ('realtime_callback_after_subscribe', 'خطأ Realtime: إضافة callback بعد الاشتراك', 'client_error', '%postgres_changes%after%subscribe%', 'critical', 1, 10, 30, true, true),
  ('realtime_channel_error', 'خطأ قناة Realtime (CHANNEL_ERROR)', 'client_error', '%CHANNEL_ERROR%', 'warning', 3, 10, 30, true, false),
  ('realtime_timeout', 'انتهاء مهلة قناة Realtime', 'client_error', '%realtime%timed out%', 'warning', 3, 15, 60, true, false),
  ('realtime_closed', 'إغلاق غير متوقع لقناة Realtime', 'client_error', '%realtime channel closed%', 'info', 5, 15, 60, true, false),
  ('client_error_spike', 'ارتفاع مفاجئ في أخطاء العميل', 'client_error', NULL, 'critical', 20, 10, 60, true, true),
  ('login_failed_spike', 'تكرار فشل تسجيل الدخول', 'login_failed', NULL, 'warning', 10, 10, 30, true, false),
  ('unauthorized_access_spike', 'محاولات وصول غير مصرح', 'unauthorized_access', NULL, 'critical', 3, 10, 30, true, true);

-- 6) تنظيف الحوادث القديمة
CREATE OR REPLACE FUNCTION public.cron_cleanup_old_alert_incidents()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.alert_incidents
  WHERE status = 'resolved' AND resolved_at < now() - interval '90 days';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_cleanup_old_alert_incidents() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cron_cleanup_old_alert_incidents() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_cleanup_old_alert_incidents() TO service_role;