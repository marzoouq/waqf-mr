-- إصلاح: فلترة الأنظمة المخفية (is_visible = false) للأدوار غير الإدارية
DROP POLICY IF EXISTS "Authorized roles can view bylaws" ON public.waqf_bylaws;

CREATE POLICY "Authorized roles can view bylaws"
ON public.waqf_bylaws
FOR SELECT
TO public
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    (has_role(auth.uid(), 'beneficiary'::app_role) OR has_role(auth.uid(), 'waqif'::app_role) OR has_role(auth.uid(), 'accountant'::app_role))
    AND is_visible = true
  )
);