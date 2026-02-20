-- إصلاح: إزالة PUBLIC من دوال الإشعارات بالكامل
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) FROM PUBLIC;

-- إعادة المنح للمصادقين فقط
GRANT EXECUTE ON FUNCTION public.notify_admins(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_beneficiaries(text, text, text, text) TO authenticated;