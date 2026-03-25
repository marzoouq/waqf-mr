

# فحص صفحات العقود والدخل والمصروفات — النتائج

## الحالة العامة
الصفحات الثلاث مبنية بشكل متسق ومنظم: فصل المنطق في hooks مخصصة (ContractsPage تستخدم `useContractsPage`)، دعم mobile/desktop، فلاتر متقدمة، تصدير PDF/CSV، وإدارة السنوات المقفلة. لكن هناك ملاحظات تستحق المعالجة:

---

## المشاكل المكتشفة

### 1. ContractsPage: تصدير CSV يفتقد حالة `cancelled` (وظيفي)
- **السطر 60**: `'الحالة': c.status === 'active' ? 'ساري' : 'منتهي'` — لا يتعامل مع `cancelled`
- **الإصلاح**: إضافة حالة "ملغي" كما تم في `RecentContractsCard`

### 2. ContractsPage: فلتر الحالة لا يشمل `cancelled` (وظيفي)
- **السطر 115-118**: خيارات الفلتر: all, active, expired, overdue — لا يوجد خيار "ملغي"
- **`statusCounts`** في `useContractsPage.ts` سطر 291-300: يعدّ فقط `active` والباقي كـ `expired`
- **الإصلاح**: إضافة فلتر `cancelled` مع عدّاد مناسب

### 3. IncomePage: `totalIncome` بدون `useMemo` (أداء)
- **السطر 124**: `const totalIncome = income.reduce(...)` — يُحسب في كل render
- يُستخدم في `summaryCards` useMemo كـ dependency مما يُبطل التخزين
- **الإصلاح**: لفّه بـ `useMemo`

### 4. ExpensesPage: `totalExpenses` بدون `useMemo` (أداء)
- **السطر 119**: نفس المشكلة — `const totalExpenses = expenses.reduce(...)`
- **الإصلاح**: لفّه بـ `useMemo`

### 5. IncomePage: لا يتحقق من وجود سنة مالية عند عدم التعديل (منطقي)
- **السطر 81-86**: يتحقق من `fiscalYear?.id` لكن لا يمنع الإضافة إذا لم تكن موجودة (يعيّن `fiscal_year_id` فقط إذا وجدت)
- **الإصلاح**: موجود بالفعل في السطر 82-85 ✅

### 6. ExpensesPage: لا يمنع الإضافة بدون سنة مالية (منطقي)
- **السطر 81**: `if (!editingExpense && fiscalYear?.id)` — إذا لم تكن هناك سنة مالية، يُنشئ المصروف بدون `fiscal_year_id`
- **الإصلاح**: إضافة تحقق مماثل لصفحة الدخل (toast خطأ + return)

### 7. `useContractsPage`: `allExpanded` ليس في `useMemo` (أداء طفيف)
- **السطر 329**: يُحسب في كل render. تأثير محدود لأنه عملية بسيطة لكنه يستحق التنظيف.

### 8. ContractsPage: `handleBulkRenew` بدون `useCallback` (أداء طفيف)
- **السطر 208**: دالة async كبيرة تُعاد إنشاؤها في كل render
- **ملاحظة**: تأثير محدود لأنها لا تُمرر كـ prop. يمكن تأجيله.

---

## خطة التنفيذ

### الملف 1: `src/pages/dashboard/ContractsPage.tsx`
- إصلاح تصدير CSV ليشمل حالة `cancelled` → "ملغي"
- إضافة خيار فلتر "ملغي" في القائمة المنسدلة

### الملف 2: `src/hooks/page/useContractsPage.ts`
- إضافة عدّاد `cancelled` في `statusCounts`
- تعديل فلترة `filteredGroups` لدعم حالة `cancelled`

### الملف 3: `src/pages/dashboard/IncomePage.tsx`
- لف `totalIncome` بـ `useMemo`

### الملف 4: `src/pages/dashboard/ExpensesPage.tsx`
- لف `totalExpenses` بـ `useMemo`
- إضافة تحقق من وجود سنة مالية قبل إنشاء مصروف جديد (مماثل لصفحة الدخل)

---

## تقييم المخاطر

| البند | خطورة | تأثير | جهد |
|-------|--------|-------|-----|
| CSV بدون cancelled | منخفض | دقة تصدير | دقيقة |
| فلتر cancelled مفقود | متوسط | وظيفي | 5 دقائق |
| totalIncome بدون memo | منخفض | أداء | دقيقة |
| totalExpenses بدون memo | منخفض | أداء | دقيقة |
| مصروف بدون سنة مالية | متوسط | سلامة بيانات | دقيقتان |

