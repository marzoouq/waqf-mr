-- حذف النسخة القديمة (p_user_id text) والإبقاء على (p_user_id uuid)
DROP FUNCTION IF EXISTS public.log_access_event(text, text, text, text, text, jsonb);