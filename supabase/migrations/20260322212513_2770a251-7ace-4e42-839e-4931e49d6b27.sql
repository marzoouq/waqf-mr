-- Security Fix: إضافة accountant في سياسة SELECT للتوزيعات
DROP POLICY IF EXISTS "Users can view their own distributions" ON distributions;
CREATE POLICY "Users can view their own distributions"
  ON distributions FOR SELECT TO authenticated
  USING (
    beneficiary_id IN (SELECT id FROM beneficiaries WHERE user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'waqif')
    OR has_role(auth.uid(), 'accountant')
  );

-- تحديث search_path للدالة
CREATE OR REPLACE FUNCTION public.set_distribution_fiscal_year()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.fiscal_year_id IS NULL AND NEW.account_id IS NOT NULL THEN
    SELECT fiscal_year_id INTO NEW.fiscal_year_id
    FROM public.accounts WHERE id = NEW.account_id;
  END IF;
  RETURN NEW;
END;
$$;