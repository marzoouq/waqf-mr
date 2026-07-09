# تناقض صفحتَي "الفواتير" و"مصروفات الوقف" في لوحة المستفيد

## التناقضات المؤكَّدة بعد الفحص المباشر

| # | التناقض | الدليل (ملف:سطر) |
|---|---------|------------------|
| 1 | نفس صفوف `invoices` تُعرض مرتين: كسطر مستقل في "الفواتير" وكمستند مرفق بمصروف في "المصروفات" | `useInvoicesViewPage.ts:36,50-61` + `useExpensesViewPage.ts:41,61-64` — كلاهما يستدعي `useInvoicesByFiscalYear(fiscalYearId)` |
| 2 | خلط الإيراد بالمصروف تحت اسم "الفواتير" رغم أن الوصف يقول "فواتير الوقف" | `useInvoicesViewPage.ts:37` (`usePaymentInvoices`) + `beneficiaryCopy.ts:47-49` |
| 3 | تسمية "فواتير الشراء" تخالف قاعدة النظام "تأجير فقط لا شراء" (`mem://core`) | `InvoicesViewPage.tsx:70` + `types/invoices.ts:80` (`InvoiceSourceFilter = 'purchase'`) |
| 4 | نص context متناقض: يعِد "لا فواتير باسم المستفيد" ثم يعرض `payment_invoices` الصادرة **للمستأجرين** لا "باسم الوقف" | `beneficiaryCopy.ts:49` مقابل `useInvoicesViewPage.ts:62-73` |
| 5 | صفحة "مصروفات الوقف" هي parity كامل مع لوحة الناظر (فلاتر متقدمة + بحث + ترتيب + جدول تفصيلي + بطاقات مصروفات) — يتجاوز نطاق دور المستفيد "قراءة فقط للإفصاح" | `ExpensesViewPage.tsx:53-125` + تعليق `useExpensesViewPage.ts:3-7` |
| 6 | قابلية الإخفاء غير متكافئة: `invoices` روله `[accountant, beneficiary]` بينما `expenses` روله `[accountant, beneficiary, waqif]` | `sections.ts:72,77` |
| 7 | اشتراكان Realtime على نفس القنوات (`invoices`, `fiscal_years`) بمعرّفَين مختلفَين — تكلفة مضاعفة | `useInvoicesViewPage.ts:30-34` + `useExpensesViewPage.ts:34-38` |
| 8 | اختباران انحداريّان يقفلان الحالة الحالية ويمنعان أي تصحيح دلالي لاحق دون تحديثهما | `src/test/invoiceSourceFilter.test.ts` + `src/test/invoicesExpensesDecoupling.test.ts` |

## المبدأ التصحيحي

**كل مفهوم مالي في مكان واحد، وبمستوى تجميع يليق بدور المستفيد "قراءة فقط للإفصاح"**.

- `/beneficiary/invoices` → فواتير الإيجار (ZATCA) فقط.
- `/beneficiary/expenses` → إفصاح مصروفات مُلخَّص (بطاقات + مخطط + تصدير)، بدون جدول تشغيلي.
- فواتير الموردين تظل مستنداً مرفقاً في تفاصيل المصروف كما هي الآن، ولا تتكرر كسطر مستقل.

## نطاق التعديل

### 1) صفحة الفواتير — إبقاء فواتير الإيجار فقط
- `src/pages/beneficiary/InvoicesViewPage.tsx`
  - حذف `<Tabs>` بالكامل و `sourceFilter` UI (الأسطر 65-72).
- `src/hooks/page/beneficiary/financial/useInvoicesViewPage.ts`
  - إزالة `useInvoicesByFiscalYear` واستيراده + `expenseInvoices` + `expenseItems`.
  - إزالة `sourceFilter` state وواجهته.
  - `unifiedInvoices` تصبح `rentInvoices` فقط.
  - تحديث قناة Realtime لـ `['payment_invoices']` فقط.
- `src/constants/beneficiaryCopy.ts` — `INVOICES_SCOPE_COPY`:
  - `title`: "فواتير الإيجار"
  - `description`: "فواتير الإيجار الصادرة من الوقف لمستأجريه — للاطلاع فقط"
  - `context`: نص جديد يوضح أنها مستندات ZATCA للإيرادات.

### 2) صفحة مصروفات الوقف — تحويل إلى إفصاح مُلخَّص
- `src/pages/beneficiary/ExpensesViewPage.tsx`
  - إبقاء: `ExpenseSummaryCards`, `ExpensesPieChart`, `ExportMenu`, `RequirePublishedYears`, بانر "للاطلاع فقط".
  - حذف: `AdvancedFiltersBar`, حقل البحث, `ExpensesMobileCards`, `ExpensesDesktopTable`, `TablePagination`, `ViewModeToggle`, `useViewMode`.
- `src/hooks/page/beneficiary/financial/useExpensesViewPage.ts`
  - إزالة `useInvoicesByFiscalYear` + `expenseInvoiceMap` + `documentedCount`/`documentationRate` (تُحسب على الإجماليات فقط إن أُريد إبقاؤها كبطاقة، أو تُحذف).
  - إزالة filters/sort/pagination/expandedRow/uniqueTypes/paginatedExpenses/filteredExpenses.
  - `handleExportCsv`/`handleExportPdf` يعملان على `expenses` كاملة.
  - قناة Realtime لـ `['expenses']` فقط.

### 3) توحيد المصطلحات في الأنواع (اختياري لكن مُوصى به)
- `src/types/invoices.ts`: تغيير `InvoiceSourceFilter` من `'all' | 'purchase' | 'rent'` إلى `'all' | 'supplier' | 'rent'` وتغيير `UnifiedInvoiceItem.source` بنفس القياس.
- تحديث المستخدم الوحيد المتبقّي: `src/hooks/page/admin/financial/useInvoicesPage.ts` + `src/pages/dashboard/InvoicesPage.tsx` (تبديل الحرفية والـ label).

### 4) توحيد قابلية الإخفاء
- `src/constants/sections.ts:77`: إضافة `'waqif'` لدور `invoices` ليطابق `expenses`.

### 5) تحديث الاختبارات (إلزامي لعدم كسر CI)
- `src/test/invoiceSourceFilter.test.ts`: تعديل التوقّعات لتقبل `'supplier'` بدل `'purchase'`، أو إبقاء `'purchase'` إن لم نُنفّذ الخطوة 3.
- `src/test/invoicesExpensesDecoupling.test.ts`: يبقى صالحاً (يعزّز الفصل الذي نُكرّسه).
- `src/test/dashboardRoutesContract.test.ts`: تحقّق فقط — لا تغيير مسارات.

### 6) تحديث الذاكرة
- `mem://business-logic/finance/beneficiary-expenses-view-parity`: تحويلها من "parity كامل" إلى "إفصاح مُلخَّص" مع ذكر أن جدول-بصف محصور بلوحة الناظر.

## ما لن يتغيّر

- منطق قاعدة البيانات: RLS/GRANT/الجداول/الدوال/الـ Edge Functions.
- لوحتا الناظر/المحاسب — لا مسّ بـ `useInvoicesPage`/`ExpensesPage` وظيفياً (فقط إعادة تسمية إن نُفّذت الخطوة 3).
- المسارات `/beneficiary/invoices` و `/beneficiary/expenses` تبقيان.
- الأذونات على مستوى RLS.

## بديل مقترح (إن رغبت بحل أبسط)

**دمج الصفحتين في صفحة واحدة**: `/beneficiary/financial-disclosure` تحوي تبويبَين: "الإيرادات (فواتير الإيجار)" و"المصروفات (ملخَّص)". يُلغي التناقض جذرياً بتقليل المسارات، لكن يتطلب تحديث nav + routes + tests أوسع.

هل أعتمد المسار الأساسي (فصل نظيف بين الصفحتين) أم البديل (دمج في صفحة إفصاح واحدة)؟
