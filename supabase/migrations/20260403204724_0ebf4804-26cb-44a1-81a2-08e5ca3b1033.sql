
-- دالة لمزامنة الدور إلى auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION public.sync_role_to_auth_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE auth.users 
    SET raw_app_meta_data = raw_app_meta_data - 'user_role'
    WHERE id = OLD.user_id;
    RETURN OLD;
  ELSE
    UPDATE auth.users 
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('user_role', NEW.role::text)
    WHERE id = NEW.user_id;
    RETURN NEW;
  END IF;
END;
$$;

-- Trigger: عند إضافة/تعديل/حذف دور
CREATE TRIGGER trg_sync_role_to_auth_meta
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.sync_role_to_auth_meta();

-- مزامنة الأدوار الحالية (one-time backfill)
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('user_role', ur.role::text)
FROM public.user_roles ur
WHERE u.id = ur.user_id;

-- تنظيف: إعطاء صلاحية للدالة
REVOKE ALL ON FUNCTION public.sync_role_to_auth_meta() FROM PUBLIC;
