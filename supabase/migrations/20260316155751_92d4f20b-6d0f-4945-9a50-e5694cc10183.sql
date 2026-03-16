
-- إصلاح صلاحيات العروض الآمنة: سحب الوصول من anon وتقييد authenticated إلى SELECT فقط

-- contracts_safe: سحب كل صلاحيات anon (ثغرة حقيقية!)
REVOKE ALL ON public.contracts_safe FROM anon;

-- تقييد الصلاحيات لـ authenticated إلى SELECT فقط
REVOKE ALL ON public.contracts_safe FROM authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;

-- beneficiaries_safe: تقييد إلى SELECT فقط
REVOKE ALL ON public.beneficiaries_safe FROM authenticated;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

-- سحب أي صلاحيات anon احتياطياً
REVOKE ALL ON public.beneficiaries_safe FROM anon;
