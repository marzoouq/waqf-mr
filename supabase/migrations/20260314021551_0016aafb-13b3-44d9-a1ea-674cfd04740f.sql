
-- ═══════════════════════════════════════════════════════════════════════════════
-- CRIT-03: إضافة guard داخلي لـ get_next_icv — admin/accountant فقط
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_next_icv()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_next int;
BEGIN
  -- حماية: فقط admin و accountant
  IF NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'غير مصرح باستعلام ICV';
  END IF;

  SELECT COALESCE(MAX(icv), 0) + 1 INTO v_next FROM invoice_chain;
  RETURN v_next;
END;
$$;

-- تقييد الصلاحيات
REVOKE EXECUTE ON FUNCTION public.get_next_icv() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_next_icv() TO authenticated, service_role;
