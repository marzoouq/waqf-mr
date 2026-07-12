
-- ============================================================
-- Migration 2 + 3: صلاحيات دور الدعم + مفاتيح الصيانة + Realtime
-- ============================================================

-- ─── 1) سياسات دور support على support_tickets ───
CREATE POLICY "Support can view all tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can update tickets"
  ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role))
  WITH CHECK (has_role(auth.uid(), 'support'::app_role));

-- ─── 2) سياسات دور support على support_ticket_replies ───
CREATE POLICY "Support can view all replies"
  ON public.support_ticket_replies
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role));

CREATE POLICY "Support can insert replies"
  ON public.support_ticket_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'support'::app_role)
    AND auth.uid() = sender_id
  );

CREATE POLICY "Support can update own replies"
  ON public.support_ticket_replies
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'support'::app_role) AND auth.uid() = sender_id)
  WITH CHECK (has_role(auth.uid(), 'support'::app_role) AND auth.uid() = sender_id);

-- ─── 3) app_settings: قراءة عامة + تعديل مفاتيح الصيانة فقط لدور support ───
DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;

CREATE POLICY "Authorized roles can read settings"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR (
      (
        has_role(auth.uid(), 'beneficiary'::app_role)
        OR has_role(auth.uid(), 'waqif'::app_role)
        OR has_role(auth.uid(), 'accountant'::app_role)
        OR has_role(auth.uid(), 'support'::app_role)
      )
      AND key <> ALL (ARRAY['pii_encryption_key'::text, 'zatca_otp_1'::text, 'zatca_otp_2'::text])
    )
  );

CREATE POLICY "Support can update maintenance settings"
  ON public.app_settings
  FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'support'::app_role)
    AND key = ANY (ARRAY['maintenance_mode'::text, 'maintenance_message'::text, 'maintenance_started_at'::text])
  )
  WITH CHECK (
    has_role(auth.uid(), 'support'::app_role)
    AND key = ANY (ARRAY['maintenance_mode'::text, 'maintenance_message'::text, 'maintenance_started_at'::text])
  );

-- ─── 4) access_log: قراءة وحذف client_error فقط لدور support ───
CREATE POLICY "Support can view client errors"
  ON public.access_log
  FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'support'::app_role)
    AND event_type = 'client_error'
  );

CREATE POLICY "Support can delete old client errors"
  ON public.access_log
  FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'support'::app_role)
    AND event_type = 'client_error'
  );

-- ─── 5) إعدادات وضع الصيانة ───
INSERT INTO public.app_settings (key, value) VALUES
  ('maintenance_mode', 'false'),
  ('maintenance_message', 'النظام تحت الصيانة، سنعود قريباً بإذن الله'),
  ('maintenance_started_at', '')
ON CONFLICT (key) DO NOTHING;

-- ─── 6) تفعيل Realtime على app_settings (مع تجاهل الخطأ إن كان مضافاً) ───
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
