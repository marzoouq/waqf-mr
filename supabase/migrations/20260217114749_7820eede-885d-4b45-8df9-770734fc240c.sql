
-- فهارس وقائية للأعمدة المستخدمة في الاستعلامات والفلترة

-- العقود: فلترة بالحالة والوحدة وتاريخ الانتهاء
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_contracts_unit_id ON public.contracts USING btree (unit_id);
CREATE INDEX IF NOT EXISTS idx_contracts_end_date ON public.contracts USING btree (end_date);

-- الوحدات: فلترة بالعقار والحالة
CREATE INDEX IF NOT EXISTS idx_units_property_id ON public.units USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_units_status ON public.units USING btree (status);

-- المستفيدين: ربط بالمستخدم
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user_id ON public.beneficiaries USING btree (user_id);

-- التوزيعات: فلترة بالمستفيد
CREATE INDEX IF NOT EXISTS idx_distributions_beneficiary_id ON public.distributions USING btree (beneficiary_id);

-- الفواتير: فلترة بالعقار والعقد والمصروف
CREATE INDEX IF NOT EXISTS idx_invoices_property_id ON public.invoices USING btree (property_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contract_id ON public.invoices USING btree (contract_id);
CREATE INDEX IF NOT EXISTS idx_invoices_expense_id ON public.invoices USING btree (expense_id);

-- الدخل: فلترة بالعقد
CREATE INDEX IF NOT EXISTS idx_income_contract_id ON public.income USING btree (contract_id);

-- سجل التدقيق: فلترة بالجدول والتاريخ
CREATE INDEX IF NOT EXISTS idx_audit_log_table_created ON public.audit_log USING btree (table_name, created_at DESC);

-- الحسابات: فلترة بالسنة المالية
CREATE INDEX IF NOT EXISTS idx_accounts_fiscal_year ON public.accounts USING btree (fiscal_year);
