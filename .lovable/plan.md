# المرحلة 2: توحيد المنطق المالي في صفحات المستفيد

---

## الهدف

قما سابقا بالاصلاح لنفس الاخطاء والملاحظات لماذا لم تنجح

استبدال المنطق المالي المكرر في 4 صفحات للمستفيد باستخدام هوك `useFinancialSummary` الموحد، مما يضمن تطابق الارقام ويسهل الصيانة المستقبلية.

---

## التغييرات المطلوبة

### 1. تحسين useFinancialSummary (ملف واحد)

**الملف**: `src/hooks/useFinancialSummary.ts`

اضافة قيمة `expensesByTypeExcludingVat` للتعامل مع حالة استبعاد الضريبة من المصروفات (مطلوبة في صفحتي الإفصاح والتقارير المالية). هذا يحل مشكلة #6 (تناقض استبعاد VAT بين الصفحات).

---

### 2. تبسيط DisclosurePage

**الملف**: `src/pages/beneficiary/DisclosurePage.tsx`

- ازالة الاستيرادات المكررة: `useIncomeByFiscalYear`, `useExpensesByFiscalYear`, `useAccounts`, `useBeneficiaries`
- ازالة حسابات `currentAccount`, `totalIncome`, `totalExpenses`, `netAfterExpenses`, etc (حوالي 20 سطر)
- ازالة `incomeBySource` و `expensesByType` المحسوبة محليا
- استبدالها بـ `useFinancialSummary(fiscalYearId, selectedFY?.label)` واستخراج كل القيم منه
- الاحتفاظ بمنطق `currentBeneficiary` و `myShare` المحسوب من قيم الهوك

---

### 3. تبسيط MySharePage

**الملف**: `src/pages/beneficiary/MySharePage.tsx`

- ازالة `useAccounts`, `useBeneficiaries` المكررة
- ازالة حسابات `currentAccount` والقيم المالية (حوالي 15 سطر)
- استبدالها بـ `useFinancialSummary`
- الاحتفاظ بمنطق `distributions` الخاص بالصفحة (فريد ومطلوب)

---

### 4. تبسيط FinancialReportsPage

**الملف**: `src/pages/beneficiary/FinancialReportsPage.tsx`

- ازالة الاستيرادات والحسابات المكررة
- استبدالها بـ `useFinancialSummary`
- استخدام `expensesByTypeExcludingVat` الجديد بدلا من الفلترة المحلية
- الاحتفاظ بمنطق الرسوم البيانية والبيانات الشهرية (فريد)

---

### 5. تبسيط AccountsViewPage

**الملف**: `src/pages/beneficiary/AccountsViewPage.tsx`

- ازالة الاستيرادات والحسابات المكررة
- استبدالها بـ `useFinancialSummary`
- الاحتفاظ بمنطق العقود وجدول العقود (فريد ومطلوب)

---

## ملاحظة حول fiscal_year_id في الدخل والمصروفات

تم التحقق من ان صفحتي `IncomePage` و `ExpensesPage` تضيفان `fiscal_year_id` تلقائيا عند انشاء سجلات جديدة (اسطر 63-65 و 69-71). لا يوجد تغيير مطلوب هنا.

---

## ملخص الاثر

```text
+----------------------------+----------------+----------------+
| الملف                       | اسطر تُزال     | اسطر تُضاف     |
+----------------------------+----------------+----------------+
| useFinancialSummary.ts     | 0              | ~5             |
| DisclosurePage.tsx         | ~25            | ~5             |
| MySharePage.tsx            | ~20            | ~5             |
| FinancialReportsPage.tsx   | ~25            | ~5             |
| AccountsViewPage.tsx       | ~25            | ~5             |
+----------------------------+----------------+----------------+
| الإجمالي                    | ~95 سطر        | ~25 سطر        |
+----------------------------+----------------+----------------+
```

النتيجة: تقليل ~70 سطرا من الكود المكرر وتوحيد مصدر الحقيقة المالية في هوك واحد.