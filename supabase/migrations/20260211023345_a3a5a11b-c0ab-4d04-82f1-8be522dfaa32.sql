
-- جدول المحادثات
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL DEFAULT 'chat', -- chat, ticket, support
  subject text,
  status text NOT NULL DEFAULT 'open', -- open, closed
  created_by uuid NOT NULL,
  participant_id uuid, -- the other party (beneficiary or admin)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = created_by OR auth.uid() = participant_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Admins can manage all conversations"
ON public.conversations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- جدول الرسائل
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Users can update read status"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.created_by = auth.uid() OR c.participant_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE INDEX idx_messages_conversation ON public.messages (conversation_id, created_at);
CREATE INDEX idx_conversations_participants ON public.conversations (created_by, participant_id);

-- تفعيل Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- تحديث timestamp تلقائياً
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
