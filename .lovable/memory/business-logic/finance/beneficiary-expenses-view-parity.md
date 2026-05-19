---
name: Beneficiary Expenses View Parity
description: /beneficiary/expenses must mirror /dashboard/expenses data, filters, summaries and exports
type: feature
---
صفحة `/beneficiary/expenses` تطابق `/dashboard/expenses` في:

- مصدر البيانات: `useExpensesByFiscalYear` و`useInvoicesByFiscalYear` و`useProperties` نفسها عبر `useExpensesViewPage`.
- الملخصات: `ExpenseSummaryCards` + `ExpensesPieChart` بنفس المدخلات.
- الفلاتر والبحث والفرز والترقيم وعدد العناصر لكل صفحة (`DEFAULT_PAGE_SIZE`).
- التصدير: `handleExportPdf` و`handleExportCsv` بنفس الأعمدة.
- حساب نسبة التوثيق: `computeDocumentationStats` نفسها.

تختلف فقط في:

- لا إضافة/تعديل/حذف (لا `ExpenseFormDialog`, لا `ConfirmDeleteDialog`).
- لا `ExpenseBudgetBar` (إدارة الميزانية للناظر فقط).
- `isLocked = true` ثابت يخفي أزرار التحرير/الحذف في الجداول المشتركة.
- تُغلَّف بـ`RequirePublishedYears` لأن المستفيد يرى السنوات المنشورة فقط (RLS).

تحذير: لا تستدعِ `useExpensesPage` من admin داخل واجهة المستفيد. اعتمد `useExpensesViewPage` دائماً للحفاظ على فصل صلاحيات الكتابة.
