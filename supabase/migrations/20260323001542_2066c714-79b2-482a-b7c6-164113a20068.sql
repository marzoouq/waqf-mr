
-- إصلاح search_path للدوال الجديدة
ALTER FUNCTION public.validate_polymorphic_invoice_ref() SET search_path = public;
ALTER FUNCTION public.validate_polymorphic_invoice_item_ref() SET search_path = public;
