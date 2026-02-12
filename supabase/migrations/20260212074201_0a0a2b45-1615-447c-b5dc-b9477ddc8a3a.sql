
-- فهارس الأداء المفقودة
CREATE INDEX idx_income_date ON public.income (date);
CREATE INDEX idx_income_property_id ON public.income (property_id);
CREATE INDEX idx_expenses_date ON public.expenses (date);
CREATE INDEX idx_expenses_property_id ON public.expenses (property_id);
CREATE INDEX idx_contracts_property_id ON public.contracts (property_id);
CREATE INDEX idx_distributions_account_id ON public.distributions (account_id);
