
-- إضافة مشغل منع تعديل السنة المالية المقفلة لجدول العقود
CREATE TRIGGER prevent_closed_fy_contracts
  BEFORE INSERT OR UPDATE OR DELETE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_closed_fiscal_year_modification();
