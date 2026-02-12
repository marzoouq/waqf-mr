CREATE OR REPLACE FUNCTION public.notify_admins(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id, p_title, p_message, p_type, p_link
  FROM public.user_roles
  WHERE role = 'admin';
END;
$$;