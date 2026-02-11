
-- جدول الإشعارات
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  link text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all notifications"
ON public.notifications FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_notifications_user_unread ON public.notifications (user_id, is_read) WHERE is_read = false;

-- إضافة إعدادات إظهار/إخفاء الأقسام وتخصيص واجهة المستفيد
INSERT INTO app_settings (key, value) VALUES
  ('sections_visibility', '{"properties":true,"contracts":true,"income":true,"expenses":true,"beneficiaries":true,"reports":true,"accounts":true,"users":true}'),
  ('beneficiary_sections', '{"disclosure":true,"share":true,"accounts":true,"reports":true}'),
  ('notification_settings', '{"contract_expiry":true,"contract_expiry_days":30,"payment_delays":true,"email_notifications":false}'),
  ('appearance_settings', '{"system_name":"إدارة الوقف","primary_color":"158 64% 25%","secondary_color":"43 74% 49%"}')
ON CONFLICT (key) DO NOTHING;

-- تفعيل Realtime للإشعارات
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
