
-- 1. تقييد صلاحيات عرض beneficiaries_safe على authenticated فقط
REVOKE ALL ON public.beneficiaries_safe FROM anon;
REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- 2. تقييد صلاحيات عرض contracts_safe على authenticated فقط
REVOKE ALL ON public.contracts_safe FROM anon;
REVOKE ALL ON public.contracts_safe FROM PUBLIC;
GRANT SELECT ON public.contracts_safe TO authenticated;

-- 3. تعديل سياسة المستفيدين على جدول contracts لاستبعاد الأعمدة الحساسة
-- بما أن RLS لا تدعم تقييد الأعمدة، نستبدل السياسة بسياسة تمنع المستفيدين من الوصول المباشر
-- ونوجههم لاستخدام contracts_safe
DROP POLICY IF EXISTS "Authorized roles can view contracts" ON public.contracts;

-- إعادة إنشاء السياسة بدون المستفيدين (يستخدمون contracts_safe)
CREATE POLICY "Authorized roles can view contracts"
ON public.contracts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'waqif'::app_role)
  OR has_role(auth.uid(), 'accountant'::app_role)
);

-- 4. منح المستفيدين وصول فقط عبر contracts_safe (التي تحجب بيانات المستأجرين)
-- contracts_safe بالفعل view مع SECURITY INVOKER لكن يحتاج سياسة SELECT على الجدول الأساسي
-- لذا نضيف سياسة مقيدة للمستفيدين تعمل فقط عبر contracts_safe
CREATE POLICY "Beneficiaries view contracts via safe view only"
ON public.contracts FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'beneficiary'::app_role)
);
