
-- جدول تذاكر الدعم الفني
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL DEFAULT 'TKT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 4),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'medium',
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- فهارس
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_created_by ON public.support_tickets(created_by);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);

-- تمكين RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- سياسات الوصول
CREATE POLICY "Admins can manage all tickets"
  ON public.support_tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can view all tickets"
  ON public.support_tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Users can view own tickets"
  ON public.support_tickets FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create tickets"
  ON public.support_tickets FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update own open tickets"
  ON public.support_tickets FOR UPDATE
  USING (auth.uid() = created_by AND status = 'open');

-- جدول ردود التذاكر
CREATE TABLE public.support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ticket_replies_ticket ON public.support_ticket_replies(ticket_id);

ALTER TABLE public.support_ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all replies"
  ON public.support_ticket_replies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Accountants can view non-internal replies"
  ON public.support_ticket_replies FOR SELECT
  USING (public.has_role(auth.uid(), 'accountant') AND is_internal = false);

CREATE POLICY "Users can view replies on own tickets"
  ON public.support_ticket_replies FOR SELECT
  USING (
    is_internal = false AND
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Users can add replies to own tickets"
  ON public.support_ticket_replies FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    is_internal = false AND
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.created_by = auth.uid())
  );

-- تمكين Realtime للتذاكر
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_replies;

-- Trigger تحديث updated_at
CREATE OR REPLACE FUNCTION public.update_support_ticket_timestamp()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_support_ticket_updated
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_timestamp();
