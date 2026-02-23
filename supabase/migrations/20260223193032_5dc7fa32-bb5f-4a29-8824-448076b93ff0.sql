
-- 1. Add published column
ALTER TABLE public.fiscal_years
  ADD COLUMN published boolean NOT NULL DEFAULT false;

-- 2. Drop old SELECT policy
DROP POLICY IF EXISTS "Authorized roles can view fiscal_years" ON public.fiscal_years;

-- 3. Admin + Accountant see all
CREATE POLICY "Admins and accountants can view all fiscal_years"
  ON public.fiscal_years FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'accountant')
  );

-- 4. Beneficiary + Waqif see only published
CREATE POLICY "Beneficiaries and waqif can view published fiscal_years"
  ON public.fiscal_years FOR SELECT
  USING (
    published = true AND (
      has_role(auth.uid(), 'beneficiary') OR
      has_role(auth.uid(), 'waqif')
    )
  );
