-- حذف السياسة المفتوحة التي تكشف PII لكل المسجلين
DROP POLICY IF EXISTS "All authenticated can view beneficiary names" ON public.beneficiaries;