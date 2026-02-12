
-- Use CREATE OR REPLACE approach - drop then create
DROP TRIGGER IF EXISTS audit_accounts ON public.accounts;
DROP TRIGGER IF EXISTS audit_income ON public.income;
DROP TRIGGER IF EXISTS audit_expenses ON public.expenses;
DROP TRIGGER IF EXISTS audit_contracts ON public.contracts;
DROP TRIGGER IF EXISTS audit_beneficiaries ON public.beneficiaries;
DROP TRIGGER IF EXISTS audit_distributions ON public.distributions;
DROP TRIGGER IF EXISTS audit_properties ON public.properties;
DROP TRIGGER IF EXISTS audit_units ON public.units;
DROP TRIGGER IF EXISTS audit_fiscal_years ON public.fiscal_years;
DROP TRIGGER IF EXISTS prevent_closed_fy_income ON public.income;
DROP TRIGGER IF EXISTS prevent_closed_fy_expenses ON public.expenses;
DROP TRIGGER IF EXISTS prevent_closed_fy_invoices ON public.invoices;

CREATE TRIGGER audit_accounts
  AFTER INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_income
  AFTER INSERT OR UPDATE OR DELETE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_contracts
  AFTER INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_beneficiaries
  AFTER INSERT OR UPDATE OR DELETE ON public.beneficiaries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_distributions
  AFTER INSERT OR UPDATE OR DELETE ON public.distributions
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_properties
  AFTER INSERT OR UPDATE OR DELETE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_units
  AFTER INSERT OR UPDATE OR DELETE ON public.units
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_fiscal_years
  AFTER INSERT OR UPDATE OR DELETE ON public.fiscal_years
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER prevent_closed_fy_income
  BEFORE INSERT OR UPDATE OR DELETE ON public.income
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();

CREATE TRIGGER prevent_closed_fy_expenses
  BEFORE INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();

CREATE TRIGGER prevent_closed_fy_invoices
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();
