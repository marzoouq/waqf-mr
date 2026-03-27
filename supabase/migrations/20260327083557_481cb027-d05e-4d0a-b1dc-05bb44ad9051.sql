-- إزالة الأعمدة المضافة — الإبقاء على ai_chat_sessions كحل مستقل
ALTER TABLE public.messages DROP COLUMN IF EXISTS is_ai_response;
ALTER TABLE public.conversations DROP COLUMN IF EXISTS ai_mode;