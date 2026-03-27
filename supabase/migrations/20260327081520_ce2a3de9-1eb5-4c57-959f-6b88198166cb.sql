
-- جدول محادثات المساعد الذكي
CREATE TABLE IF NOT EXISTS public.ai_chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  mode text NOT NULL DEFAULT 'chat',
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- فهرس للاستعلام السريع بالمستخدم
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON public.ai_chat_sessions(user_id);

-- تفعيل RLS
ALTER TABLE public.ai_chat_sessions ENABLE ROW LEVEL SECURITY;

-- سياسة: المستخدم يرى محادثاته فقط
CREATE POLICY "Users can manage own ai_chat_sessions"
  ON public.ai_chat_sessions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION public.update_ai_chat_sessions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_chat_sessions_updated_at
  BEFORE UPDATE ON public.ai_chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_chat_sessions_updated_at();
