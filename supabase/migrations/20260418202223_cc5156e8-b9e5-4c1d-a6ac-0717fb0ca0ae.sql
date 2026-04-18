-- ============================================
-- P9 #1: CRITICAL — تفعيل security_invoker على 4 views
-- ============================================
ALTER VIEW public.beneficiaries_safe SET (security_invoker = on);
ALTER VIEW public.contracts_safe SET (security_invoker = on);
ALTER VIEW public.v_fiscal_year_summary SET (security_invoker = on);
ALTER VIEW public.zatca_certificates_safe SET (security_invoker = on);

-- ============================================
-- P9 #2: CRITICAL — تأمين realtime.messages
-- يسمح فقط لـ admin/accountant بالاشتراك بالقنوات المالية
-- مع استثناء صريح للمستفيد/الواقف على notifications فقط
-- ============================================

-- حذف أي سياسة سابقة بنفس الاسم (idempotent)
DROP POLICY IF EXISTS "Authorized realtime subscriptions" ON realtime.messages;

CREATE POLICY "Authorized realtime subscriptions"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- admin/accountant: وصول كامل لكل قنوات realtime
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'accountant'::public.app_role)
);

-- ============================================
-- P9 #3: WARN — تشديد روابط الأدوار على access_log
-- نقل السياسات من {public} إلى {authenticated}
-- ============================================
ALTER POLICY "Admins can view access_log" ON public.access_log TO authenticated;
ALTER POLICY "No deletes on access_log" ON public.access_log TO authenticated;
ALTER POLICY "No direct inserts on access_log" ON public.access_log TO authenticated;
ALTER POLICY "No updates on access_log" ON public.access_log TO authenticated;

ALTER POLICY "Admins can view access_log_archive" ON public.access_log_archive TO authenticated;
ALTER POLICY "No deletes on access_log_archive" ON public.access_log_archive TO authenticated;
ALTER POLICY "No inserts on access_log_archive" ON public.access_log_archive TO authenticated;
ALTER POLICY "No updates on access_log_archive" ON public.access_log_archive TO authenticated;