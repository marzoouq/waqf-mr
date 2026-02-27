
-- حذف السياسة الخاطئة
DROP POLICY IF EXISTS "Beneficiaries cannot update advance_requests" ON public.advance_requests;

-- سياسة تسمح فقط للناظر والمحاسب بتعديل طلبات السُلف (المستفيد لا يملك صلاحية تعديل)
CREATE POLICY "Only admins and accountants can update advance_requests"
ON public.advance_requests
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role)
);
