
-- Custom Access Token Hook: يحقن دور المستخدم في JWT claims
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims jsonb;
  user_role text;
BEGIN
  -- استخراج claims الحالية
  claims := event->'claims';

  -- جلب دور المستخدم
  SELECT role::text INTO user_role
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid
  LIMIT 1;

  -- حقن الدور في claims (أو null إذا لم يوجد)
  IF user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  END IF;

  -- إرجاع الحدث مع claims المعدّلة
  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- منح صلاحية التنفيذ لـ supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- منح صلاحية القراءة على جدول user_roles لـ supabase_auth_admin
GRANT SELECT ON TABLE public.user_roles TO supabase_auth_admin;

-- تسجيل الـ Hook في إعدادات Auth (عبر تعيين في app_settings)
-- ملاحظة: يتم تفعيل الـ hook عبر لوحة التحكم أو SQL config
INSERT INTO public.app_settings (key, value) 
VALUES ('auth_hook_custom_access_token', 'enabled')
ON CONFLICT (key) DO UPDATE SET value = 'enabled', updated_at = now();
