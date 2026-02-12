
-- 1. حماية audit_log من التلاعب المباشر
-- منع INSERT المباشر (يجب أن يتم فقط عبر triggers)
CREATE POLICY "Only triggers can insert audit_log"
ON public.audit_log
FOR INSERT
WITH CHECK (false);

-- منع UPDATE على audit_log
CREATE POLICY "No one can update audit_log"
ON public.audit_log
FOR UPDATE
USING (false);

-- منع DELETE على audit_log
CREATE POLICY "No one can delete audit_log"
ON public.audit_log
FOR DELETE
USING (false);

-- 2. منع حذف الرسائل إلا للمشرفين
CREATE POLICY "Only admins can delete messages"
ON public.messages
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. إضافة فهارس على fiscal_year_id لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_income_fiscal_year ON public.income(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_expenses_fiscal_year ON public.expenses(fiscal_year_id);
CREATE INDEX IF NOT EXISTS idx_invoices_fiscal_year ON public.invoices(fiscal_year_id);
