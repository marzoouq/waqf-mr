
-- توحيد جميع حقول المبالغ إلى numeric(15,2)
-- يجب إسقاط العروض المعتمدة على الأعمدة أولاً ثم إعادة إنشائها

-- 1) إسقاط العروض
DROP VIEW IF EXISTS public.contracts_safe;
DROP VIEW IF EXISTS public.beneficiaries_safe;

-- 2) تعديل الأعمدة
-- properties
ALTER TABLE public.properties ALTER COLUMN area TYPE numeric(15,2);

-- contracts
ALTER TABLE public.contracts ALTER COLUMN rent_amount TYPE numeric(15,2);
ALTER TABLE public.contracts ALTER COLUMN payment_amount TYPE numeric(15,2);

-- income
ALTER TABLE public.income ALTER COLUMN amount TYPE numeric(15,2);

-- expenses
ALTER TABLE public.expenses ALTER COLUMN amount TYPE numeric(15,2);

-- accounts
ALTER TABLE public.accounts ALTER COLUMN total_income TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN total_expenses TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN admin_share TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN waqif_share TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN waqf_revenue TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN vat_amount TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN distributions_amount TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN net_after_expenses TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN net_after_vat TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN zakat_amount TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN waqf_corpus_manual TYPE numeric(15,2);
ALTER TABLE public.accounts ALTER COLUMN waqf_corpus_previous TYPE numeric(15,2);

-- distributions
ALTER TABLE public.distributions ALTER COLUMN amount TYPE numeric(15,2);

-- payment_invoices
ALTER TABLE public.payment_invoices ALTER COLUMN amount TYPE numeric(15,2);
ALTER TABLE public.payment_invoices ALTER COLUMN paid_amount TYPE numeric(15,2);
ALTER TABLE public.payment_invoices ALTER COLUMN vat_amount TYPE numeric(15,2);

-- invoices
ALTER TABLE public.invoices ALTER COLUMN amount TYPE numeric(15,2);
ALTER TABLE public.invoices ALTER COLUMN vat_amount TYPE numeric(15,2);
ALTER TABLE public.invoices ALTER COLUMN amount_excluding_vat TYPE numeric(15,2);

-- invoice_items
ALTER TABLE public.invoice_items ALTER COLUMN unit_price TYPE numeric(15,2);
ALTER TABLE public.invoice_items ALTER COLUMN vat_amount TYPE numeric(15,2);
ALTER TABLE public.invoice_items ALTER COLUMN line_total TYPE numeric(15,2);

-- expense_budgets
ALTER TABLE public.expense_budgets ALTER COLUMN budget_amount TYPE numeric(15,2);

-- advance_requests
ALTER TABLE public.advance_requests ALTER COLUMN amount TYPE numeric(15,2);

-- advance_carryforward
ALTER TABLE public.advance_carryforward ALTER COLUMN amount TYPE numeric(15,2);

-- contract_fiscal_allocations
ALTER TABLE public.contract_fiscal_allocations ALTER COLUMN allocated_amount TYPE numeric(15,2);

-- 3) إعادة إنشاء العروض
CREATE OR REPLACE VIEW public.contracts_safe AS
SELECT id,
    contract_number,
    property_id,
    unit_id,
    tenant_name,
    start_date,
    end_date,
    rent_amount,
    payment_type,
    payment_count,
    payment_amount,
    status,
    fiscal_year_id,
    created_at,
    updated_at,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_id_type ELSE NULL::text END AS tenant_id_type,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_id_number ELSE NULL::text END AS tenant_id_number,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_tax_number ELSE NULL::text END AS tenant_tax_number,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_crn ELSE NULL::text END AS tenant_crn,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_street ELSE NULL::text END AS tenant_street,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_building ELSE NULL::text END AS tenant_building,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_district ELSE NULL::text END AS tenant_district,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_city ELSE NULL::text END AS tenant_city,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN tenant_postal_code ELSE NULL::text END AS tenant_postal_code,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN notes ELSE NULL::text END AS notes
FROM contracts c
WHERE auth.uid() IS NOT NULL;

CREATE OR REPLACE VIEW public.beneficiaries_safe AS
SELECT id,
    name,
    share_percentage,
    created_at,
    updated_at,
    user_id,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN national_id ELSE NULL::text END AS national_id,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN bank_account ELSE NULL::text END AS bank_account,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN email ELSE NULL::text END AS email,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN phone ELSE NULL::text END AS phone,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role) THEN notes ELSE NULL::text END AS notes
FROM beneficiaries b
WHERE auth.uid() IS NOT NULL;
