CREATE OR REPLACE FUNCTION public.request_account_link()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
  v_link text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'غير مصرح'; END IF;
  IF EXISTS (SELECT 1 FROM public.beneficiaries WHERE user_id = v_uid) THEN
    RETURN 'already_linked';
  END IF;
  v_link := '/dashboard/beneficiaries?link_request=' || v_uid::text;
  -- طلب واحد كل 24 ساعة لكل مستخدم
  IF EXISTS (SELECT 1 FROM public.notifications WHERE link = v_link AND created_at > now() - interval '24 hours') THEN
    RETURN 'already_requested';
  END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT DISTINCT ur.user_id, 'طلب ربط حساب مستفيد',
    'المستخدم ' || coalesce(v_email, v_uid::text) || ' يطلب ربط حسابه بسجل مستفيد.', 'info', v_link
  FROM public.user_roles ur WHERE ur.role = 'admin';
  RETURN 'sent';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.request_account_link() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_account_link() TO authenticated;