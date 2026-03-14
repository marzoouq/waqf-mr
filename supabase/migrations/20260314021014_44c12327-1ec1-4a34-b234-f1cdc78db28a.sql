-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: get_pii_key — إضافة فحص دور admin/accountant لمنع المستفيدين من استخراج مفتاح التشفير
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_pii_key()
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- حماية: يجب أن يكون المستخدم مسجلاً
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;
  -- حماية: فقط admin و accountant يمكنهم الحصول على مفتاح التشفير
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RETURN NULL;
  END IF;
  RETURN (SELECT value FROM public.app_settings WHERE key = 'pii_encryption_key' LIMIT 1);
END;
$$;

-- سحب الصلاحيات وإعادة منحها
REVOKE ALL ON FUNCTION public.get_pii_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_pii_key() TO authenticated, service_role;

-- ═══════════════════════════════════════════════════════════════════════════════
-- FIX: تقييد صلاحيات العروض إلى SELECT فقط
-- ═══════════════════════════════════════════════════════════════════════════════

REVOKE ALL ON public.beneficiaries_safe FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.beneficiaries_safe TO authenticated, service_role;

REVOKE ALL ON public.contracts_safe FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated, service_role;