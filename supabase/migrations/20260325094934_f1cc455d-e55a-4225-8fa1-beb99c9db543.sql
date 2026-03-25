-- الإصلاح 1: تقييد سياسة advance_carryforward من public إلى authenticated
DROP POLICY IF EXISTS "Beneficiaries can view own carryforward" ON public.advance_carryforward;
CREATE POLICY "Beneficiaries can view own carryforward"
  ON public.advance_carryforward FOR SELECT
  TO authenticated
  USING (beneficiary_id IN (
    SELECT id FROM public.beneficiaries WHERE user_id = auth.uid()
  ));

-- الإصلاح 2+3: تعزيز حماية العروض الآمنة بدلاً من تحويلها لـ security_invoker
-- السبب: تحويل العروض لـ security_invoker=true يتطلب GRANT SELECT على الجداول الأصلية
-- مما يعني أن المستفيد/الواقف يمكنه تجاوز العرض والوصول للبيانات الخام (PII)
-- التصميم الحالي (security_definer + security_barrier + CASE WHEN masking) هو الأصح

-- التأكد من سحب كل الصلاحيات من anon على العروض
REVOKE ALL ON public.beneficiaries_safe FROM anon;
REVOKE ALL ON public.contracts_safe FROM anon;

-- التأكد من أن authenticated فقط لديه SELECT
REVOKE ALL ON public.beneficiaries_safe FROM authenticated;
GRANT SELECT ON public.beneficiaries_safe TO authenticated;

REVOKE ALL ON public.contracts_safe FROM authenticated;
GRANT SELECT ON public.contracts_safe TO authenticated;

-- التأكد من عدم وجود GRANT مباشر على الجداول الأصلية لـ beneficiary/waqif
-- (admin و accountant فقط عبر RLS policies)
REVOKE SELECT ON public.beneficiaries FROM anon;
REVOKE SELECT ON public.contracts FROM anon;