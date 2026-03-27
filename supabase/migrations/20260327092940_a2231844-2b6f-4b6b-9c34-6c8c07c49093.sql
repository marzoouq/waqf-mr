-- حذف سياسات RLS أولاً ثم حذف الجدول
DROP POLICY IF EXISTS "Users can manage own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can read own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.ai_chat_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.ai_chat_sessions;
DROP TABLE IF EXISTS public.ai_chat_sessions;