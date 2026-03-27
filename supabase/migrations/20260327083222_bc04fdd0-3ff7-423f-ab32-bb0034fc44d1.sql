-- إضافة عمود is_ai_response لجدول messages
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_ai_response boolean NOT NULL DEFAULT false;

-- إضافة عمود ai_mode لجدول conversations (لمحادثات AI فقط)
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS ai_mode text;