-- إصلاح سياسة user_roles: استبدال RESTRICTIVE ALL بسياسات تقييدية للتعديل فقط
-- هذا يسمح للمستفيدين بقراءة أدوارهم مع حصر التعديل على الناظر

DROP POLICY IF EXISTS "Only admins can modify roles" ON public.user_roles;

CREATE POLICY "Only admins can insert roles"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));