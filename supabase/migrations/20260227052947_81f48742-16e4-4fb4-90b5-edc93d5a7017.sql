-- Add prevent_closed_fiscal_year_modification trigger to distributions table
CREATE TRIGGER prevent_closed_fy_distributions
BEFORE INSERT OR UPDATE OR DELETE ON public.distributions
FOR EACH ROW
EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();