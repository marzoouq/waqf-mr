## الهدف
إعادة الإفصاح الكامل عن فواتير الشراء للمستفيد/الواقف مع إزالة التكرار: كل مصروف يظهر مع فواتيره المرفقة القابلة للفتح داخل صفحة "مصروفات الوقف" الموحّدة.

## التغييرات

### 1) `src/hooks/page/beneficiary/financial/useExpensesViewPage.ts` (إعادة كتابة)
- إضافة `useInvoicesByFiscalYear(fiscalYearId)` بجانب `useExpensesByFiscalYear`.
- استخدام `computeDocumentationStats` لبناء `expenseInvoiceMap` و`documentedCount` و`documentationRate`.
- إضافة state ترقيم: `currentPage`, `setCurrentPage`, `ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE` و`paginatedExpenses`.
- إضافة state توسيع صف: `expandedRow`, `setExpandedRow`.
- توسيع `useDashboardRealtime` ليشمل `['expenses', 'invoices']`.
- تحديث CSV export ليتضمن عمود "عدد الفواتير المرفقة".
- `isLoading` يجمع تحميل المصروفات + الفواتير.

### 2) `src/pages/beneficiary/ExpensesViewPage.tsx` (تحديث)
- إبقاء `ExpenseSummaryCards` بقيم `documentedCount/documentationRate` الحقيقية بدل الأصفار.
- إبقاء `ExpensesPieChart`.
- إضافة قسم "سجل المصروفات ومستنداتها" أسفلها يستخدم:
  - `ExpensesMobileCards` (mobile) مع `readOnly` و`expenseInvoiceMap` وتوسّع لعرض `ExpenseAttachments`.
  - `ExpensesDesktopTable` (desktop) بنفس الإعداد وبدون عمود إجراءات (`readOnly`).
  - `TablePagination` أسفل السجل.
- تحديث بانر التوضيح ليعكس الإفصاح الجديد.

### 3) `src/constants/beneficiaryCopy.ts` (إضافة)
- إضافة `EXPENSES_SCOPE_COPY` (title/description/context) واستيراده في الصفحة.
- إبقاء `INVOICES_SCOPE_COPY` كما هو (فواتير الإيجار فقط).

### 4) اختبارات موجودة
- `src/test/invoiceSourceFilter.test.ts` يبقى أخضر (لا نُعيد `source: 'purchase'` لصفحة الفواتير).
- إضافة اختبار خفيف `src/test/beneficiaryExpensesView.test.ts` يتحقّق:
  - `useExpensesViewPage` يُرجع `expenseInvoiceMap` و`documentedCount` و`documentationRate`.
  - CSV يتضمن عمود "عدد الفواتير المرفقة".

### 5) تحقق تشغيلي
- `bun run tsgo --noEmit` نظيف.
- `bunx vitest run src/test/beneficiaryExpensesView.test.ts src/test/invoiceSourceFilter.test.ts` أخضر.
- Playwright: تسجيل دخول كمستفيد → `/beneficiary/expenses` → التقاط لقطة تُظهر بطاقات الإجماليات + سجل المصروفات + فتح مرفق ZATCA داخل `InvoiceViewer`.

## خارج النطاق
- لا تغيير على لوحة الناظر أو RLS.
- لا إعادة فواتير الشراء كتبويب مستقل في صفحة "الفواتير".
- لا تعديل على `useInvoicesViewPage` أو `InvoicesViewPage`.

## النتيجة النهائية للمستخدم
- **صفحة "مصروفات الوقف"**: إجماليات + نسبة توثيق + مخطط + سجل تفصيلي لكل مصروف مع أزرار فواتيره المرفقة قابلة للفتح.
- **صفحة "الفواتير"**: فواتير الإيجار (ZATCA) فقط — بدون تكرار.
