-- Backfill user_role into auth.users.raw_app_meta_data for all existing users
UPDATE auth.users u
SET raw_app_meta_data = 
  COALESCE(u.raw_app_meta_data, '{}'::jsonb) 
  || jsonb_build_object('user_role', ur.role::text)
FROM public.user_roles ur
WHERE u.id = ur.user_id
  AND (u.raw_app_meta_data->>'user_role' IS NULL 
       OR u.raw_app_meta_data->>'user_role' != ur.role::text);