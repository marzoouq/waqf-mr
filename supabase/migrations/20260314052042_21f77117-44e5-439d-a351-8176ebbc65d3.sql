
-- منح صلاحيات الاستخدام على الـ Sequence للأدوار المطلوبة
GRANT USAGE, SELECT ON SEQUENCE public.icv_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.icv_seq TO service_role;
