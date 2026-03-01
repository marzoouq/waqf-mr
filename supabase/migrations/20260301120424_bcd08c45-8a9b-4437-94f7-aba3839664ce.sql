
-- إزالة سياسة FOR ALL للمحاسب على fiscal_years واستبدالها بسياسات محددة
DROP POLICY IF EXISTS "Accountants can manage fiscal_years" ON public.fiscal_years;

-- المحاسب يمكنه عرض السنوات المالية (SELECT موجود بالفعل في سياسة أخرى)
-- المحاسب يمكنه إنشاء سنوات مالية فقط
CREATE POLICY "Accountants can insert fiscal_years"
ON public.fiscal_years
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'accountant'::app_role));

-- المحاسب يمكنه تعديل فقط الحقول غير الحساسة (published, label) لكن ليس status
-- لتبسيط الأمر: نمنع UPDATE تماماً للمحاسب - فقط الناظر يعدل
-- الناظر لديه بالفعل سياسة FOR ALL
