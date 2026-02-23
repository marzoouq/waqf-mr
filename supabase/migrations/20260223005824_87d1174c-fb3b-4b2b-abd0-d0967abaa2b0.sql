
-- سياسات CRUD للمحاسب على الجداول المالية والتشغيلية
CREATE POLICY "Accountants can manage properties"
ON public.properties FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage contracts"
ON public.contracts FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage income"
ON public.income FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage expenses"
ON public.expenses FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage invoices"
ON public.invoices FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage accounts"
ON public.accounts FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage beneficiaries"
ON public.beneficiaries FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage units"
ON public.units FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage tenant_payments"
ON public.tenant_payments FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage distributions"
ON public.distributions FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Accountants can manage fiscal_years"
ON public.fiscal_years FOR ALL
USING (public.has_role(auth.uid(), 'accountant'));

-- سياسات العرض
DROP POLICY IF EXISTS "Admins can view audit_log" ON public.audit_log;
CREATE POLICY "Admins and accountants can view audit_log"
ON public.audit_log FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

DROP POLICY IF EXISTS "Authorized roles can view bylaws" ON public.waqf_bylaws;
CREATE POLICY "Authorized roles can view bylaws"
ON public.waqf_bylaws FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'beneficiary') OR public.has_role(auth.uid(), 'waqif') OR public.has_role(auth.uid(), 'accountant'));

DROP POLICY IF EXISTS "Authorized roles can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings"
ON public.app_settings FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'beneficiary') OR public.has_role(auth.uid(), 'waqif') OR public.has_role(auth.uid(), 'accountant'));

-- تحديث دالة منع تعديل السنوات المقفلة
CREATE OR REPLACE FUNCTION public.prevent_closed_fiscal_year_modification()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  fy_status text;
  fy_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    fy_id := OLD.fiscal_year_id;
  ELSE
    fy_id := NEW.fiscal_year_id;
  END IF;

  IF fy_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT status INTO fy_status FROM public.fiscal_years WHERE id = fy_id;

  IF fy_status = 'closed' AND NOT public.has_role(auth.uid(), 'admin') AND NOT public.has_role(auth.uid(), 'accountant') THEN
    RAISE EXCEPTION 'لا يمكن تعديل بيانات سنة مالية مقفلة';
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$;
