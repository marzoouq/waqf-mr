-- إشعارات خادمية لرسائل وتذاكر المستفيدين (لا تعتمد على الواجهة)
CREATE OR REPLACE FUNCTION public.notify_staff_internal(p_title text, p_message text, p_link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT ur.user_id, left(p_title, 200), left(p_message, 2000), 'info', p_link
  FROM public.user_roles ur WHERE ur.role IN ('admin', 'support');
$$;
REVOKE ALL ON FUNCTION public.notify_staff_internal(text, text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_notify_staff_ticket_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.notify_staff_internal('تذكرة دعم فني جديدة ' || NEW.ticket_number,
    'تذكرة جديدة: ' || left(NEW.title, 150), '/dashboard/support');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_notify_staff_ticket_fn() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_staff_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_staff_ticket_fn();

CREATE OR REPLACE FUNCTION public.trg_notify_staff_reply_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t record;
BEGIN
  SELECT ticket_number, created_by INTO t FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF t.created_by = NEW.sender_id THEN
    PERFORM public.notify_staff_internal('رد جديد على التذكرة ' || t.ticket_number,
      'أضاف صاحب التذكرة ردًا جديدًا', '/dashboard/support');
  ELSIF NOT NEW.is_internal AND t.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (t.created_by, 'رد على تذكرتك ' || t.ticket_number, 'تم الرد على طلب الدعم الخاص بك', 'info', '/beneficiary/support');
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_notify_staff_reply_fn() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_staff_reply
  AFTER INSERT ON public.support_ticket_replies
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_staff_reply_fn();

CREATE OR REPLACE FUNCTION public.trg_notify_message_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_staff boolean;
BEGIN
  SELECT subject, created_by, participant_id INTO c FROM public.conversations WHERE id = NEW.conversation_id;
  UPDATE public.conversations SET updated_at = now() WHERE id = NEW.conversation_id;
  v_staff := public.has_role(NEW.sender_id, 'admin') OR public.has_role(NEW.sender_id, 'accountant');
  IF v_staff THEN
    IF c.participant_id IS NOT NULL AND c.participant_id <> NEW.sender_id THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (c.participant_id, 'رسالة جديدة من ناظر الوقف',
        'لديك رسالة جديدة في محادثة "' || left(coalesce(c.subject, 'محادثة'), 100) || '"', 'info', '/beneficiary/messages');
    ELSIF c.created_by <> NEW.sender_id AND NOT (public.has_role(c.created_by, 'admin') OR public.has_role(c.created_by, 'accountant')) THEN
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (c.created_by, 'رسالة جديدة من ناظر الوقف',
        'لديك رسالة جديدة في محادثة "' || left(coalesce(c.subject, 'محادثة'), 100) || '"', 'info', '/beneficiary/messages');
    END IF;
  ELSE
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT ur.user_id, 'رسالة جديدة من مستفيد',
      'رسالة جديدة في محادثة "' || left(coalesce(c.subject, 'محادثة'), 100) || '"', 'info', '/dashboard/messages'
    FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.user_id <> NEW.sender_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.trg_notify_message_fn() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_notify_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_message_fn();

-- المشارك يستطيع تحديث وقت النشاط فقط
CREATE POLICY "Participants can touch conversations" ON public.conversations
  FOR UPDATE TO authenticated
  USING (participant_id IS NOT NULL AND auth.uid() = participant_id)
  WITH CHECK (participant_id IS NOT NULL AND auth.uid() = participant_id);

CREATE OR REPLACE FUNCTION public.guard_participant_conversation_update()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() = OLD.participant_id AND auth.uid() <> OLD.created_by
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.type IS DISTINCT FROM OLD.type OR NEW.subject IS DISTINCT FROM OLD.subject
       OR NEW.status IS DISTINCT FROM OLD.status OR NEW.created_by IS DISTINCT FROM OLD.created_by
       OR NEW.participant_id IS DISTINCT FROM OLD.participant_id THEN
      RAISE EXCEPTION 'المشارك يستطيع تحديث وقت النشاط فقط';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_guard_participant_conversation_update
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.guard_participant_conversation_update();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['support_tickets', 'support_ticket_replies'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;