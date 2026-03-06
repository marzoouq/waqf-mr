
-- 1. REVOKE دوال cron/invoices من authenticated
REVOKE EXECUTE ON FUNCTION public.cron_check_late_payments() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_contract_invoices(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_all_active_invoices() FROM authenticated;

-- 2. إضافة دور الواقف لسياسة قراءة beneficiaries
DROP POLICY IF EXISTS "Beneficiaries can view their own data" ON public.beneficiaries;
CREATE POLICY "Beneficiaries can view their own data"
ON public.beneficiaries FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'admin')
  OR has_role(auth.uid(), 'accountant')
  OR has_role(auth.uid(), 'waqif')
);
