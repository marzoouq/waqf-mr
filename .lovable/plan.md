

# إكمال البنود المتبقية من الخطة (4 بنود)

## ما تم إنجازه سابقاً (9/13):
- جدول السنوات المالية مع البيانات
- إصلاح العقود المنتهية والحصص
- محدد السنة المالية في صفحات الدخل والمصروفات والفواتير
- العرض الشبكي للفواتير ومرفقات المصروفات
- جدول audit_log والدالة
- Edge Function للعقود

---

## البنود المتبقية

### 1. تفعيل Audit Triggers على الجداول المالية
الدالة `audit_trigger_func` موجودة لكنها غير مربوطة بأي جدول. يجب إنشاء triggers على:
- `income` (INSERT/UPDATE/DELETE)
- `expenses` (INSERT/UPDATE/DELETE)
- `accounts` (INSERT/UPDATE/DELETE)
- `distributions` (INSERT/UPDATE/DELETE)

### 2. إضافة FiscalYearSelector في صفحة الحسابات الختامية
صفحة `AccountsPage.tsx` تستدعي `useIncome()` و `useExpenses()` بدون تصفية بالسنة المالية. يجب:
- إضافة محدد السنة المالية
- تصفية الدخل والمصروفات حسب السنة المختارة
- عرض البيانات المالية للسنة المحددة فقط

### 3. آلية إقفال السنة المالية
إضافة زر "إقفال السنة" في صفحة الحسابات يقوم بـ:
- تغيير حالة السنة الحالية من `active` إلى `closed`
- حساب الرصيد المتبقي وترحيله كـ `waqf_corpus_previous` للسنة التالية
- إنشاء سنة مالية جديدة تلقائياً إن لم تكن موجودة
- تأكيد من المستخدم قبل الإقفال (AlertDialog)

### 4. حماية السنة المقفلة من التعديل
- منع إضافة/تعديل/حذف الدخل والمصروفات في سنة مقفلة
- إظهار تنبيه عند محاولة التعديل على سنة مقفلة
- تطبيق الحماية في الواجهة (تعطيل الأزرار) وفي قاعدة البيانات (validation trigger)

---

## التفاصيل التقنية

### Migration SQL:
- إنشاء 4 audit triggers على جداول: income, expenses, accounts, distributions
- إنشاء validation trigger يمنع INSERT/UPDATE/DELETE على income و expenses إذا كانت السنة المالية المرتبطة مقفلة

### تعديل AccountsPage.tsx:
- استيراد `FiscalYearSelector` و `useActiveFiscalYear` و `useFiscalYears`
- استبدال `useIncome()` بـ `useIncomeByFiscalYear(fiscalYearId)`
- استبدال `useExpenses()` بـ `useExpensesByFiscalYear(fiscalYearId)`
- إضافة state للسنة المختارة
- إضافة زر إقفال السنة مع AlertDialog للتأكيد
- إضافة منطق الإقفال: تحديث fiscal_years + إنشاء سنة جديدة + ترحيل الرصيد
- تعطيل أزرار التعديل عند عرض سنة مقفلة

### تعديل IncomePage.tsx و ExpensesPage.tsx:
- إضافة فحص حالة السنة المختارة
- تعطيل زر "إضافة" عند عرض سنة مقفلة
- إخفاء أزرار التعديل والحذف للسجلات في سنة مقفلة

