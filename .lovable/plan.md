

# خطة: إضافة overflow-x-auto للجداول + فحص جنائي للمكونات المشتركة

## ملخص النتائج

### 1. جداول تفتقر إلى `overflow-x-auto` في صفحات المستفيدين

مكون `Table` من shadcn/ui يحتوي على `overflow-auto` في غلافه الداخلي، لكن بدون `min-w` على `<table>` لن يتم تفعيل التمرير الأفقي فعلياً. الصفحات التي تحتاج إصلاح:

| الصفحة | المشكلة |
|--------|---------|
| **ContractsViewPage.tsx** (سطر 194-195) | `<Table>` بدون `overflow-x-auto` wrapper وبدون `min-w` — 7 أعمدة تُضغط في الجوال |
| **MySharePage.tsx** (سطر 448) | جدول التوزيعات بدون `overflow-x-auto` wrapper |
| **MySharePage.tsx** (سطر 482) | جدول السُلف بدون `overflow-x-auto` wrapper |
| **MySharePage.tsx** (سطر 521) | جدول الفروق المرحّلة بدون `overflow-x-auto` wrapper |

**DisclosurePage** و **InvoicesViewPage** و **CarryforwardHistoryPage** — محمية بالفعل بـ `overflow-x-auto` + `min-w`.

### 2. نتائج فحص المكونات المشتركة

| المكون | الحالة | الملاحظة |
|--------|--------|---------|
| `ExportMenu` | سليم | بسيط، لا مشاكل أداء |
| `TablePagination` | سليم | لا constants داخل component |
| `MobileCardView` | سليم | Generic component، مصمم جيداً |
| `NotificationBell` | سليم | `typeIcons` و `typeColors` خارج المكون |
| `GlobalSearch` | سليم | يستخدم `useCallback` و debounce و AbortController |
| `Sidebar` | سليم | `ROLE_LABELS` مستوردة كـ constant |
| `WaqfInfoBar` | سليم | `FIELDS` خارج المكون |
| `FiscalYearSelector` | سليم | بسيط، لا مشاكل |
| `FinancialReportsPage` (beneficiary) | تحسين طفيف | `incomeVsExpenses`, `distributionData`, `expensesPieData`, `incomePieData` تُعاد إنشاؤها في كل render بدون `useMemo` |

### 3. مشكلة ارتفاع صفحة المراسلات

`BeneficiaryMessagesPage` (سطر 99): `h-[calc(100vh-theme(spacing.14))]` — قد يتجاوز الشاشة لأن `DashboardLayout` يضيف header وpadding. الإصلاح: استخدام `h-[calc(100dvh-8rem)]` مع `dvh` للتوافق مع الجوال.

---

## خطة التنفيذ

### المهمة 1: إضافة overflow-x-auto + min-w لجداول المستفيدين

**ContractsViewPage.tsx** — تغليف Table (سطر 194-195):
```tsx
// من:
<CardContent className="p-0">
  <Table>
// إلى:
<CardContent className="p-0">
  <div className="overflow-x-auto">
    <Table className="min-w-[700px]">
```

**MySharePage.tsx** — 3 جداول (التوزيعات سطر 448، السُلف سطر 482، الفروق المرحّلة سطر 521):
```tsx
// تغليف كل جدول بـ:
<div className="overflow-x-auto">
  <Table className="min-w-[500px]">
```

### المهمة 2: تحسين أداء FinancialReportsPage

تغليف `incomeVsExpenses`, `distributionData`, `expensesPieData`, `incomePieData` بـ `useMemo`:
```tsx
const incomeVsExpenses = useMemo(() => [...], [totalIncome, totalExpenses]);
const expensesPieData = useMemo(() => [...], [expensesByTypeExcludingVat]);
// إلخ
```

### المهمة 3: إصلاح ارتفاع صفحة المراسلات

**BeneficiaryMessagesPage.tsx** سطر 99:
```tsx
// من:
h-[calc(100vh-theme(spacing.14))] lg:h-screen
// إلى:
h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-4rem)]
```

---

## ملخص التغييرات

- **4 ملفات** تحتاج تعديل
- **ContractsViewPage.tsx**: إضافة `overflow-x-auto` + `min-w-[700px]`
- **MySharePage.tsx**: إضافة `overflow-x-auto` + `min-w-[500px]` لـ 3 جداول
- **FinancialReportsPage.tsx** (beneficiary): تغليف 4 مصفوفات بيانات بـ `useMemo`
- **BeneficiaryMessagesPage.tsx**: إصلاح ارتفاع الحاوية للتوافق مع الجوال

