-- فهارس جدول الإيرادات
CREATE INDEX IF NOT EXISTS idx_income_date ON public.income USING btree (date DESC);
CREATE INDEX IF NOT EXISTS idx_income_contract_id ON public.income USING btree (contract_id);

-- فهارس جدول المصروفات
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses USING btree (date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON public.expenses USING btree (property_id);

-- فهرس حالة الفواتير
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices USING btree (status);

-- فهرس مركّب للعقود (استعلامات لوحة التحكم)
CREATE INDEX IF NOT EXISTS idx_contracts_property_status ON public.contracts USING btree (property_id, status);

-- فهرس مركّب للتوزيعات
CREATE INDEX IF NOT EXISTS idx_distributions_ben_fy ON public.distributions USING btree (beneficiary_id, fiscal_year_id);