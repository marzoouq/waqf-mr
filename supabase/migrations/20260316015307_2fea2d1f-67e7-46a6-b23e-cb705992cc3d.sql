
-- إضافة ON DELETE قيود على المفاتيح الأجنبية الحرجة
-- fiscal_year_id: SET NULL (اختياري — البيانات تبقى حتى لو حُذفت السنة)
-- contract_id: CASCADE (حذف العقد يحذف فواتيره)
-- property_id: SET NULL (حذف العقار لا يحذف المصروفات/الدخل)

-- 1. expenses.fiscal_year_id
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_fiscal_year_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 2. expenses.property_id
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_property_id_fkey;
ALTER TABLE public.expenses ADD CONSTRAINT expenses_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- 3. income.fiscal_year_id
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_fiscal_year_id_fkey;
ALTER TABLE public.income ADD CONSTRAINT income_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 4. income.property_id
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_property_id_fkey;
ALTER TABLE public.income ADD CONSTRAINT income_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- 5. income.contract_id
ALTER TABLE public.income DROP CONSTRAINT IF EXISTS income_contract_id_fkey;
ALTER TABLE public.income ADD CONSTRAINT income_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- 6. invoices.fiscal_year_id
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_fiscal_year_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 7. invoices.contract_id
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_contract_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE SET NULL;

-- 8. invoices.property_id
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_property_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- 9. invoices.expense_id
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_expense_id_fkey;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_expense_id_fkey
  FOREIGN KEY (expense_id) REFERENCES public.expenses(id) ON DELETE SET NULL;

-- 10. payment_invoices.contract_id → CASCADE
ALTER TABLE public.payment_invoices DROP CONSTRAINT IF EXISTS payment_invoices_contract_id_fkey;
ALTER TABLE public.payment_invoices ADD CONSTRAINT payment_invoices_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- 11. payment_invoices.fiscal_year_id
ALTER TABLE public.payment_invoices DROP CONSTRAINT IF EXISTS payment_invoices_fiscal_year_id_fkey;
ALTER TABLE public.payment_invoices ADD CONSTRAINT payment_invoices_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 12. contracts.fiscal_year_id
ALTER TABLE public.contracts DROP CONSTRAINT IF EXISTS contracts_fiscal_year_id_fkey;
ALTER TABLE public.contracts ADD CONSTRAINT contracts_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 13. contracts.property_id → RESTRICT (لا يُحذف عقار له عقود)
-- نبقيه بدون ON DELETE = RESTRICT افتراضياً — وهو السلوك الحالي المطلوب

-- 14. accounts.fiscal_year_id
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_fiscal_year_id_fkey;
ALTER TABLE public.accounts ADD CONSTRAINT accounts_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 15. distributions.fiscal_year_id
ALTER TABLE public.distributions DROP CONSTRAINT IF EXISTS distributions_fiscal_year_id_fkey;
ALTER TABLE public.distributions ADD CONSTRAINT distributions_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 16. distributions.account_id → CASCADE
ALTER TABLE public.distributions DROP CONSTRAINT IF EXISTS distributions_account_id_fkey;
ALTER TABLE public.distributions ADD CONSTRAINT distributions_account_id_fkey
  FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;

-- 17. distributions.beneficiary_id → CASCADE
ALTER TABLE public.distributions DROP CONSTRAINT IF EXISTS distributions_beneficiary_id_fkey;
ALTER TABLE public.distributions ADD CONSTRAINT distributions_beneficiary_id_fkey
  FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE CASCADE;

-- 18. advance_requests.fiscal_year_id
ALTER TABLE public.advance_requests DROP CONSTRAINT IF EXISTS advance_requests_fiscal_year_id_fkey;
ALTER TABLE public.advance_requests ADD CONSTRAINT advance_requests_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 19. advance_requests.beneficiary_id → CASCADE
ALTER TABLE public.advance_requests DROP CONSTRAINT IF EXISTS advance_requests_beneficiary_id_fkey;
ALTER TABLE public.advance_requests ADD CONSTRAINT advance_requests_beneficiary_id_fkey
  FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE CASCADE;

-- 20. advance_carryforward.beneficiary_id → CASCADE
ALTER TABLE public.advance_carryforward DROP CONSTRAINT IF EXISTS advance_carryforward_beneficiary_id_fkey;
ALTER TABLE public.advance_carryforward ADD CONSTRAINT advance_carryforward_beneficiary_id_fkey
  FOREIGN KEY (beneficiary_id) REFERENCES public.beneficiaries(id) ON DELETE CASCADE;

-- 21. advance_carryforward.from_fiscal_year_id
ALTER TABLE public.advance_carryforward DROP CONSTRAINT IF EXISTS advance_carryforward_from_fiscal_year_id_fkey;
ALTER TABLE public.advance_carryforward ADD CONSTRAINT advance_carryforward_from_fiscal_year_id_fkey
  FOREIGN KEY (from_fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 22. advance_carryforward.to_fiscal_year_id
ALTER TABLE public.advance_carryforward DROP CONSTRAINT IF EXISTS advance_carryforward_to_fiscal_year_id_fkey;
ALTER TABLE public.advance_carryforward ADD CONSTRAINT advance_carryforward_to_fiscal_year_id_fkey
  FOREIGN KEY (to_fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 23. contract_fiscal_allocations.contract_id → CASCADE
ALTER TABLE public.contract_fiscal_allocations DROP CONSTRAINT IF EXISTS contract_fiscal_allocations_contract_id_fkey;
ALTER TABLE public.contract_fiscal_allocations ADD CONSTRAINT contract_fiscal_allocations_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- 24. contract_fiscal_allocations.fiscal_year_id
ALTER TABLE public.contract_fiscal_allocations DROP CONSTRAINT IF EXISTS contract_fiscal_allocations_fiscal_year_id_fkey;
ALTER TABLE public.contract_fiscal_allocations ADD CONSTRAINT contract_fiscal_allocations_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE SET NULL;

-- 25. tenant_payments.contract_id → CASCADE
ALTER TABLE public.tenant_payments DROP CONSTRAINT IF EXISTS tenant_payments_contract_id_fkey;
ALTER TABLE public.tenant_payments ADD CONSTRAINT tenant_payments_contract_id_fkey
  FOREIGN KEY (contract_id) REFERENCES public.contracts(id) ON DELETE CASCADE;

-- 26. expense_budgets.fiscal_year_id
ALTER TABLE public.expense_budgets DROP CONSTRAINT IF EXISTS expense_budgets_fiscal_year_id_fkey;
ALTER TABLE public.expense_budgets ADD CONSTRAINT expense_budgets_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE CASCADE;

-- 27. annual_report_items.fiscal_year_id → CASCADE
ALTER TABLE public.annual_report_items DROP CONSTRAINT IF EXISTS annual_report_items_fiscal_year_id_fkey;
ALTER TABLE public.annual_report_items ADD CONSTRAINT annual_report_items_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE CASCADE;

-- 28. annual_report_items.property_id
ALTER TABLE public.annual_report_items DROP CONSTRAINT IF EXISTS annual_report_items_property_id_fkey;
ALTER TABLE public.annual_report_items ADD CONSTRAINT annual_report_items_property_id_fkey
  FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL;

-- 29. annual_report_status.fiscal_year_id → CASCADE
ALTER TABLE public.annual_report_status DROP CONSTRAINT IF EXISTS annual_report_status_fiscal_year_id_fkey;
ALTER TABLE public.annual_report_status ADD CONSTRAINT annual_report_status_fiscal_year_id_fkey
  FOREIGN KEY (fiscal_year_id) REFERENCES public.fiscal_years(id) ON DELETE CASCADE;
