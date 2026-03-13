
-- إعادة منح SELECT الكامل على contracts لـ authenticated
-- لأن column-level GRANT يمنع الناظر والمحاسب من رؤية بيانات المستأجرين أيضاً
GRANT SELECT ON public.contracts TO authenticated;
