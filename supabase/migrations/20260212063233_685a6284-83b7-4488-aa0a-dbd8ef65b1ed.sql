
CREATE OR REPLACE FUNCTION public.notify_all_beneficiaries(
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT user_id, p_title, p_message, p_type, p_link
  FROM public.beneficiaries
  WHERE user_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
