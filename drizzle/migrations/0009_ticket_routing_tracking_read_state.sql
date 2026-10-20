-- توجيه التذاكر حسب القسم (مطابق لـ CATEGORY_ROUTING في الواجهة)
CREATE OR REPLACE FUNCTION public.ticket_recipient_roles(p_category text)
RETURNS text[] LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE p_category
    WHEN 'financial' THEN ARRAY['admin','accountant']
    WHEN 'technical' THEN ARRAY['admin','support']
    WHEN 'account' THEN ARRAY['admin','support']
    ELSE ARRAY['admin'] END;
$$;

CREATE OR REPLACE FUNCTION public.notify_ticket_staff(p_category text, p_title text, p_message text, p_link text, p_exclude uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT ur.user_id, left(p_title, 200), left(p_message, 2000), 'info', p_link
  FROM public.user_roles ur
  WHERE ur.role::text = ANY (public.ticket_recipient_roles(p_category))
    AND ur.user_id IS DISTINCT FROM p_exclude;
$$;
REVOKE ALL ON FUNCTION public.notify_ticket_staff(text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_staff_ticket_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_ticket_staff(NEW.category, 'تذكرة دعم فني جديدة ' || NEW.ticket_number,
    'تذكرة جديدة: ' || left(NEW.title, 150), '/dashboard/support?ticket=' || NEW.id, NEW.created_by);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.trg_notify_staff_reply_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT id, ticket_number, created_by, category INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF t.created_by = NEW.sender_id THEN
    PERFORM public.notify_ticket_staff(t.category, 'رد جديد على التذكرة ' || t.ticket_number,
      'أضاف صاحب التذكرة ردًا جديدًا', '/dashboard/support?ticket=' || t.id, NEW.sender_id);
  ELSIF NOT NEW.is_internal AND t.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (t.created_by, 'رد على تذكرتك ' || t.ticket_number, 'تم الرد على طلب الدعم الخاص بك', 'info', '/beneficiary/support?ticket=' || t.id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

-- المحاسب يرد على التذاكر المالية فقط
CREATE POLICY "Accountants reply on financial tickets" ON public.support_ticket_replies
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'accountant') AND auth.uid() = sender_id AND is_internal = false
    AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.category = 'financial'
      AND t.status NOT IN ('closed')));

-- أدوار مرسلي الردود (الدور فقط، لمن يحق له رؤية التذكرة)
CREATE OR REPLACE FUNCTION public.get_ticket_reply_roles(p_ticket_id uuid)
RETURNS TABLE(sender_id uuid, role text) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = p_ticket_id AND (t.created_by = auth.uid()
      OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support') OR public.has_role(auth.uid(), 'accountant'))) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT s.sid, (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = s.sid
      ORDER BY CASE ur.role WHEN 'admin' THEN 1 WHEN 'accountant' THEN 2 WHEN 'support' THEN 3 ELSE 4 END LIMIT 1)
    FROM (SELECT DISTINCT r.sender_id AS sid FROM public.support_ticket_replies r WHERE r.ticket_id = p_ticket_id) s;
END $$;
REVOKE ALL ON FUNCTION public.get_ticket_reply_roles(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_ticket_reply_roles(uuid) TO authenticated;

-- سجل أحداث التذكرة (إلحاق فقط)
CREATE TABLE public.support_ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_id uuid,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_support_ticket_events_ticket ON public.support_ticket_events(ticket_id, created_at);
GRANT SELECT ON public.support_ticket_events TO authenticated;
GRANT ALL ON public.support_ticket_events TO service_role;
ALTER TABLE public.support_ticket_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ticket events visible to owner and staff" ON public.support_ticket_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'support')
    OR EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND (t.created_by = auth.uid()
      OR (t.category = 'financial' AND public.has_role(auth.uid(), 'accountant')))));

CREATE OR REPLACE FUNCTION public.trg_ticket_status_events_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.support_ticket_events (ticket_id, event_type, to_status, actor_id)
    VALUES (NEW.id, 'created', NEW.status, NEW.created_by);
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.support_ticket_events (ticket_id, event_type, from_status, to_status, actor_id, note)
    VALUES (NEW.id, 'status_change', OLD.status, NEW.status, auth.uid(),
      CASE WHEN NEW.status = 'resolved' THEN NEW.resolution_notes END);
    IF NEW.created_by IS NOT NULL AND NEW.created_by IS DISTINCT FROM auth.uid() THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (NEW.created_by, 'تحديث على تذكرتك ' || NEW.ticket_number,
        'تغيّرت حالة التذكرة إلى: ' || CASE NEW.status WHEN 'in_progress' THEN 'قيد المعالجة'
          WHEN 'resolved' THEN 'تم الحل — يرجى التأكيد أو إعادة الفتح' WHEN 'closed' THEN 'مغلقة' ELSE 'مفتوحة' END,
        'info', '/beneficiary/support?ticket=' || NEW.id);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_ticket_status_events_fn() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_ticket_status_events
  AFTER INSERT OR UPDATE OF status ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_ticket_status_events_fn();

-- قفل أو إعادة فتح التذكرة من صاحبها فقط
CREATE OR REPLACE FUNCTION public.close_or_reopen_own_ticket(p_id uuid, p_action text, p_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF p_action NOT IN ('close', 'reopen') THEN RAISE EXCEPTION 'إجراء غير صالح'; END IF;
  IF NOT public.check_rate_limit('ticket_owner_action:' || auth.uid()::text, 10, 3600) THEN
    RAISE EXCEPTION 'تجاوزت الحد المسموح، حاول لاحقًا';
  END IF;
  SELECT * INTO t FROM public.support_tickets WHERE id = p_id FOR UPDATE;
  IF NOT FOUND OR t.created_by <> auth.uid() THEN RAISE EXCEPTION 'لا يمكنك تعديل هذه التذكرة'; END IF;
  IF t.status <> 'resolved' THEN RAISE EXCEPTION 'يمكن الإجراء فقط على تذكرة تم حلها'; END IF;
  IF p_action = 'close' THEN
    UPDATE public.support_tickets SET status = 'closed', updated_at = now() WHERE id = p_id;
  ELSE
    IF coalesce(btrim(p_reason), '') = '' THEN RAISE EXCEPTION 'يرجى كتابة سبب إعادة الفتح'; END IF;
    UPDATE public.support_tickets SET status = 'open', resolved_at = NULL, updated_at = now() WHERE id = p_id;
    INSERT INTO public.support_ticket_events (ticket_id, event_type, from_status, to_status, actor_id, note)
    VALUES (p_id, 'reopen_reason', 'resolved', 'open', auth.uid(), left(p_reason, 1000));
    PERFORM public.notify_ticket_staff(t.category, 'أُعيد فتح التذكرة ' || t.ticket_number,
      'المرسل أفاد بأن المشكلة لم تُحل: ' || left(p_reason, 300), '/dashboard/support?ticket=' || p_id, auth.uid());
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.close_or_reopen_own_ticket(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_or_reopen_own_ticket(uuid, text, text) TO authenticated;

-- قفل تلقائي للتذاكر المحلولة بعد 7 أيام
CREATE OR REPLACE FUNCTION public.cron_auto_close_resolved_tickets()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.support_tickets SET status = 'closed', updated_at = now()
  WHERE status = 'resolved' AND resolved_at < now() - interval '7 days';
$$;
REVOKE ALL ON FUNCTION public.cron_auto_close_resolved_tickets() FROM PUBLIC, anon, authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-close-resolved-tickets') THEN
      PERFORM cron.schedule('auto-close-resolved-tickets', '15 2 * * *', 'SELECT public.cron_auto_close_resolved_tickets()');
    END IF;
  END IF;
END $$;

-- روابط إشعارات الرسائل تحمل رقم المحادثة
CREATE OR REPLACE FUNCTION public.trg_notify_message_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_staff boolean; v_subject text;
BEGIN
  SELECT subject, created_by, participant_id INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  v_subject := left(coalesce(c.subject, 'محادثة'), 100);
  v_staff := public.has_role(NEW.sender_id, 'admin') OR public.has_role(NEW.sender_id, 'accountant');
  IF v_staff THEN
    IF c.participant_id IS NOT NULL AND c.participant_id <> NEW.sender_id THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (c.participant_id, 'رسالة جديدة من ناظر الوقف', 'لديك رسالة جديدة في محادثة "' || v_subject || '"', 'info',
        '/beneficiary/messages?conversation=' || NEW.conversation_id);
    ELSIF c.created_by <> NEW.sender_id AND NOT (public.has_role(c.created_by, 'admin') OR public.has_role(c.created_by, 'accountant')) THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (c.created_by, 'رسالة جديدة من ناظر الوقف', 'لديك رسالة جديدة في محادثة "' || v_subject || '"', 'info',
        '/beneficiary/messages?conversation=' || NEW.conversation_id);
    END IF;
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'رسالة جديدة من مستفيد', 'رسالة جديدة في محادثة "' || v_subject || '"', 'info',
      '/dashboard/messages?conversation=' || NEW.conversation_id
    FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.user_id <> NEW.sender_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

-- تعليم المحادثة كمقروءة لطرفيها فقط (رسائل الطرف الآخر + إشعاراتها)
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = p_conversation_id
      AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))) THEN
    RAISE EXCEPTION 'لست طرفًا في هذه المحادثة';
  END IF;
  UPDATE public.messages SET is_read = true
  WHERE conversation_id = p_conversation_id AND is_read = false AND sender_id <> auth.uid();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false
    AND (link LIKE '%conversation=' || p_conversation_id::text
      OR link IN ('/dashboard/messages', '/beneficiary/messages'));
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.mark_conversation_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_conversation_read(uuid) TO authenticated;

-- تعليم إشعارات التذكرة كمقروءة عند فتحها
CREATE OR REPLACE FUNCTION public.mark_ticket_notifications_read(p_ticket_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false AND link LIKE '%ticket=' || p_ticket_id::text;
$$;
REVOKE ALL ON FUNCTION public.mark_ticket_notifications_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_ticket_notifications_read(uuid) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'support_ticket_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_events;
  END IF;
END $$;