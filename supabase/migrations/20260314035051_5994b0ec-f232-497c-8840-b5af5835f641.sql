-- INV-SEC: حذف السياسة المفتوحة التي تكشف PII لكل المسجلين
DROP POLICY IF EXISTS "All authenticated can view beneficiary names" ON public.beneficiaries;

-- إعادة إنشاء العرض بـ SECURITY DEFINER لتجاوز RLS
-- العرض نفسه يُقنّع الأعمدة الحساسة — لا خطر
DROP VIEW IF EXISTS public.beneficiaries_safe;

CREATE VIEW public.beneficiaries_safe
WITH (security_barrier=true)
AS
  SELECT
    id,
    name,
    share_percentage,
    user_id,
    created_at,
    updated_at,
    '***'::text AS bank_account,
    '***'::text AS email,
    '***'::text AS national_id,
    '***'::text AS notes,
    '***'::text AS phone
  FROM public.beneficiaries;

-- منح صلاحية القراءة للأدوار المسجلة فقط
REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC;
REVOKE ALL ON public.beneficiaries_safe FROM anon;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;