
-- 1. accounts: تغيير SELECT من true إلى الأدوار المصرح لها فقط
DROP POLICY "Authenticated users can view accounts" ON public.accounts;
CREATE POLICY "Authorized roles can view accounts"
ON public.accounts
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);

-- 2. expenses: تغيير SELECT من true إلى الأدوار المصرح لها
DROP POLICY "Authenticated users can view expenses" ON public.expenses;
CREATE POLICY "Authorized roles can view expenses"
ON public.expenses
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);

-- 3. invoices: تغيير SELECT من true إلى الأدوار المصرح لها
DROP POLICY "Authenticated users can view invoices" ON public.invoices;
CREATE POLICY "Authorized roles can view invoices"
ON public.invoices
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);

-- 4. properties: تغيير SELECT من true إلى الأدوار المصرح لها
DROP POLICY "Authenticated users can view properties" ON public.properties;
CREATE POLICY "Authorized roles can view properties"
ON public.properties
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);

-- 5. tenant_payments: تغيير SELECT من true إلى الأدوار المصرح لها
DROP POLICY "Authenticated users can view tenant_payments" ON public.tenant_payments;
CREATE POLICY "Authorized roles can view tenant_payments"
ON public.tenant_payments
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);

-- 6. app_settings: تغيير SELECT من true إلى الأدوار المصرح لها
DROP POLICY "Anyone can read settings" ON public.app_settings;
CREATE POLICY "Authorized roles can read settings"
ON public.app_settings
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'beneficiary'::app_role)
  OR has_role(auth.uid(), 'waqif'::app_role)
);
