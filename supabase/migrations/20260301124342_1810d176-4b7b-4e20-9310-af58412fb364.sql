
-- إصلاح سياسة RLS للمحاسب على جدول fiscal_years
-- المحاسب يجب أن يملك SELECT + INSERT فقط (بدون UPDATE/DELETE)

-- حذف السياسة القديمة التي تمنح ALL
DROP POLICY IF EXISTS "Accountants can manage fiscal_years" ON public.fiscal_years;

-- إضافة سياسة UPDATE محدودة للمحاسب: يمكنه تعديل الحقول غير الحساسة فقط (لا يمكنه تغيير status)
-- ملاحظة: السياسة "Accountants can insert fiscal_years" موجودة بالفعل للـ INSERT
-- والسياسة "Admins and accountants can view all fiscal_years" موجودة بالفعل للـ SELECT
