
-- W-02: تحويل beneficiaries_safe إلى SECURITY DEFINER (مثل contracts_safe)
-- لمنع الواقف من قراءة email/phone من الجدول الخام مباشرة
CREATE OR REPLACE VIEW public.beneficiaries_safe
WITH (security_invoker = false, security_barrier = true)
AS SELECT id,
    name,
    share_percentage,
    user_id,
    created_at,
    updated_at,
    CASE
        WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN national_id
        WHEN user_id = auth.uid() THEN national_id
        ELSE '***'::text
    END AS national_id,
    CASE
        WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN bank_account
        WHEN user_id = auth.uid() THEN bank_account
        ELSE '***'::text
    END AS bank_account,
    CASE
        WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN email
        WHEN user_id = auth.uid() THEN email
        ELSE '***'::text
    END AS email,
    CASE
        WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN phone
        WHEN user_id = auth.uid() THEN phone
        ELSE '***'::text
    END AS phone,
    CASE
        WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN notes
        WHEN user_id = auth.uid() THEN notes
        ELSE '***'::text
    END AS notes
   FROM beneficiaries;

-- حذف سياسة الواقف من الجدول الخام (لم يعد بحاجة إليها)
DROP POLICY IF EXISTS "Waqif can view beneficiaries" ON public.beneficiaries;

-- ضمان صلاحيات العرض
GRANT SELECT ON public.beneficiaries_safe TO authenticated;
REVOKE ALL ON public.beneficiaries_safe FROM anon;

-- W-03: تقييد سياسة user_roles لدور authenticated بدل public
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
