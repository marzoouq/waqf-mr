CREATE TABLE public.access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  email text,
  user_id uuid,
  ip_info text,
  target_path text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view access_log"
  ON public.access_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert access_log"
  ON public.access_log FOR INSERT
  WITH CHECK (true);

CREATE POLICY "No updates on access_log"
  ON public.access_log FOR UPDATE USING (false);

CREATE POLICY "No deletes on access_log"
  ON public.access_log FOR DELETE USING (false);