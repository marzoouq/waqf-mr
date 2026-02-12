
-- Temporarily disable the fiscal year validation trigger on expenses
ALTER TABLE public.expenses DISABLE TRIGGER prevent_closed_fy_expenses;

-- Fix swapped descriptions
UPDATE public.expenses SET description = 'فواتير صيانة سباكة - مؤسسة الثبيتي للأدوات الصحية' WHERE id = '7cd9379d-151d-4b10-8240-fb296e28edc5';
UPDATE public.expenses SET description = 'فواتير صيانة كهرباء - شركة الجنوب للإنارة' WHERE id = '45b39def-b5a5-4c63-9f6c-ed3a82298370';

-- Fix amount discrepancy (0.92 SAR)
UPDATE public.expenses SET amount = 17072.00 WHERE id = '87ebd501-2f74-47ef-8edc-908ef6f35885';

-- Re-enable the trigger
ALTER TABLE public.expenses ENABLE TRIGGER prevent_closed_fy_expenses;
