
## التشخيص الجنائي

- لا توجد صفحة `/beneficiary/expenses` إطلاقاً، ولا hook، ولا مدخل في `beneficiaryRoutes.tsx`. المستفيد يرى المصروفات حالياً فقط كمخططات مجمَّعة داخل `FinancialReportsPage` (`expensesByTypeExcludingVat` + `monthly_expenses`) بلا جدول، بلا بحث، بلا فلاتر، بلا توثيق، بلا تصدير.
- `DEFAULT_ROLE_PERMS.beneficiary` لا يحوي `expenses`. الناظر لديه `/dashboard/expenses` كامل: PageHeader + Summary + Pie + Budget + Search + AdvancedFilters + Table + Mobile + Pagination + Export PDF/CSV + ربط بالفواتير لحساب نسبة التوثيق.
- على مستوى DB: `Authorized roles can view expenses` تسمح للمستفيد والواقف بـ SELECT، و`Restrict unpublished fiscal year data on expenses` يحجب السنوات غير المنشورة — لا تغيير DB مطلوب.
- `ExpensesDesktopTable`/`ExpensesMobileCards` يخفيان زرّي التعديل والحذف عند `isLocked=true`، فيمكن إعادة استخدامهما كقراءة فقط دون تكرار.

## القرار

إنشاء شاشة مستفيد متطابقة بصرياً ووظيفياً مع شاشة الناظر، باستثناء الكتابة (لا إضافة/تعديل/حذف/ميزانية)، عبر hook قراءة-فقط مشتق من نفس hooks البيانات. لا يتغيّر شيء في صفحة الناظر.

## التغييرات

### 1) طبقة الـhook (قراءة-فقط)

- `src/hooks/page/beneficiary/views/useExpensesViewPage.ts` جديد:
  - يستهلك `useExpensesByFiscalYear`, `useInvoicesByFiscalYear`, `useProperties`, `useFiscalYear`, `usePdfWaqfInfo`, `useTableSort`.
  - يُعيد نفس مفاتيح `useExpensesPage` التي تستخدمها مكونات العرض: `expenses, isLoading, properties, totalExpenses, uniqueTypes, expenseInvoiceMap, documentedCount, documentationRate, filteredExpenses, paginatedExpenses, searchQuery, setSearchQuery, filters, setFilters, sortField, sortDir, handleSort, currentPage, setCurrentPage, ITEMS_PER_PAGE, expandedRow, setExpandedRow, handleExportPdf, handleExportCsv, fiscalYearId, isClosed`.
  - يُثبّت `isLocked = true` دائماً (يعطّل أزرار التحرير/الحذف في الجداول المشتركة).
  - يحذف: `createExpense/updateExpense/deleteExpense`, `formData`, `isOpen`, `editingExpense`, `handleSubmit`, `handleEdit`, `handleConfirmDelete`, `deleteTarget`, `canAdd`.

### 2) صفحة المستفيد

- `src/pages/beneficiary/ExpensesViewPage.tsx` جديد، يطابق `pages/dashboard/ExpensesPage.tsx` تخطيطاً مع الفروق:
  - `PageHeaderCard` بعنوان "مصروفات الوقف" ووصف "للاطلاع فقط — جميع مصروفات الوقف".
  - `actions` يحتوي `ExportMenu` فقط (لا `ExpenseFormDialog`).
  - يحذف `LockedYearBanner` ويستبدله ببنر مستفيد موحَّد بصياغة "عرض للاطلاع فقط" متّسق مع باقي صفحات `*ViewPage`.
  - يحذف `ExpenseBudgetBar` (إدارة ميزانية ليست من اختصاص المستفيد) ويُبقي `ExpenseSummaryCards` و`ExpensesPieChart`.
  - يستخدم نفس `AdvancedFiltersBar` + بحث + `ExpensesDesktopTable`/`ExpensesMobileCards` + `TablePagination` (الأزرار التحريرية مخفية تلقائياً عبر `isLocked`).
  - بدون `ConfirmDeleteDialog`.

### 3) التوجيه والصلاحيات والملاحة

- `src/routes/beneficiaryRoutes.tsx`: استيراد كسول للصفحة + Route `/beneficiary/expenses` بحماية `ALL_NON_ACCOUNTANT` (مطابقاً لباقي صفحات العرض).
- `src/constants/rolePermissions.ts`: إضافة `expenses: true` لـ `beneficiary` و`waqif`.
- `src/constants/routeRegistry.ts`: إضافة سجل لـ `/beneficiary/expenses` بنفس الـ`labelKey/sectionKey: 'expenses'`.
- `src/constants/beneficiaryWidgets.ts` (إن كان يحدّد عناصر القائمة الجانبية للمستفيد): إضافة عنصر "المصروفات" أو التأكد من ظهوره عبر إذن `expenses`. أتحقق من المصدر الفعلي للقائمة وأعدّله بالحد الأدنى.

### 4) اختبارات

- `useExpensesViewPage.test.ts`: 
  - يُعيد نفس عدد المصروفات الذي يعيده hook الناظر لنفس السنة.
  - الفلتر/البحث/الفرز/الترقيم يتطابق.
  - `documentationRate` و`documentedCount` متطابقان مع الناظر.
  - لا يُصدِّر دوال كتابة (`createExpense`, `updateExpense`, `deleteExpense` غير موجودة في الإرجاع).
- `ExpensesViewPage.test.tsx`: يعرض الجدول، لا يعرض زر "إضافة مصروف"، لا يعرض أزرار تعديل/حذف، يعرض `ExportMenu`.

### 5) ذاكرة المشروع

- `mem://business-logic/finance/beneficiary-expenses-view-parity`: صفحة `/beneficiary/expenses` تطابق `/dashboard/expenses` في البيانات والفلاتر والملخصات والتصدير، وتختلف فقط بإخفاء الإضافة/التحرير/الحذف وإدارة الميزانية. مصدر البيانات `useExpensesByFiscalYear` نفسه عبر `useExpensesViewPage`.

## معايير القبول

- فتح `/dashboard/expenses` و`/beneficiary/expenses` على نفس السنة المنشورة → نفس عدد المصروفات، نفس الإجمالي، نفس قائمة الأنواع، نفس نسبة التوثيق.
- المستفيد لا يرى أزرار إضافة/تعديل/حذف/ميزانية، ويرى Export PDF/CSV ويعملان.
- الفلاتر (نوع، عقار، تاريخ من/إلى) والبحث والفرز والترقيم تعمل بنفس سلوك الناظر.
- السنوات غير المنشورة لا تظهر للمستفيد (RLS قائم).
- اختبارات `check-conventions.mjs` و`vitest` تمر بصفر مخالفات.
