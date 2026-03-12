
-- إنشاء VIEW آمن للعقود يحجب بيانات المستأجرين الشخصية عن غير المصرح لهم
CREATE OR REPLACE VIEW public.contracts_safe
WITH (security_invoker = on)
AS
SELECT
  id,
  contract_number,
  tenant_name,
  -- حجب بيانات الهوية والعنوان عن غير الناظر/المحاسب
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_id_number ELSE NULL END AS tenant_id_number,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_id_type ELSE NULL END AS tenant_id_type,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_tax_number ELSE NULL END AS tenant_tax_number,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_crn ELSE NULL END AS tenant_crn,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_street ELSE NULL END AS tenant_street,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_district ELSE NULL END AS tenant_district,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_city ELSE NULL END AS tenant_city,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_postal_code ELSE NULL END AS tenant_postal_code,
  CASE WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant')
    THEN tenant_building ELSE NULL END AS tenant_building,
  property_id,
  unit_id,
  start_date,
  end_date,
  rent_amount,
  payment_type,
  payment_count,
  payment_amount,
  status,
  notes,
  fiscal_year_id,
  created_at,
  updated_at
FROM public.contracts;
