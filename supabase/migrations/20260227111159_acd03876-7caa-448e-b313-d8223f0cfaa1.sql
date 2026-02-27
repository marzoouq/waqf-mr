
-- منع المستفيدين من تعديل طلبات السُلف بعد الإرسال
CREATE POLICY "Beneficiaries cannot update advance_requests"
ON public.advance_requests
FOR UPDATE
USING (false)
WITH CHECK (false);
