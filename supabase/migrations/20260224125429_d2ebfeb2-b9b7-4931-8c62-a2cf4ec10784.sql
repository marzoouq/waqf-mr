-- حذف الوظيفة القديمة أولاً للسماح بتغيير أسماء المعاملات
DROP FUNCTION IF EXISTS public.log_access_event(text, text, uuid, text, text, jsonb);

-- إعادة تسمية العمود في جدول سجل الوصول (قد يكون تم تنفيذ هذا الجزء جزئياً، لذا نستخدم الفحص)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='access_log' AND column_name='ip_info') THEN
    ALTER TABLE public.access_log RENAME COLUMN ip_info TO device_info;
  END IF;
END $$;

-- إعادة إنشاء الوظيفة بالمسمى الجديد
CREATE OR REPLACE FUNCTION public.log_access_event(
    p_event_type text,
    p_email text DEFAULT NULL,
    p_user_id uuid DEFAULT NULL,
    p_target_path text DEFAULT NULL,
    p_device_info text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.access_log (
        event_type,
        email,
        user_id,
        target_path,
        device_info,
        metadata
    )
    VALUES (
        p_event_type,
        p_email,
        p_user_id,
        p_target_path,
        p_device_info,
        p_metadata
    );
END;
$$;