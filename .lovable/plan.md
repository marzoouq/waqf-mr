

# إصلاح تحذيرات Recharts — السبب الجذري

## المشكلة الحقيقية
إضافة `minWidth={1} minHeight={1}` على `ResponsiveContainer` لا تمنع التحذير. السبب: recharts يسجّل التحذير بناءً على حجم **العنصر الأب** المقاس، قبل تطبيق القيم الدنيا. 

العناصر الأب (wrapper divs) تحتوي على `style={{ minWidth: 0 }}` أو `style={{ minWidth: 0, minHeight: 0 }}`. هذا يسمح للحاوية بالانكماش إلى 0px عند التصيير الأوّلي (خاصة مع lazy loading)، فيقيس recharts الحجم كـ -1 ويُصدر التحذير.

## الحل
تغيير `minWidth: 0` إلى حذفه أو استبداله بـ Tailwind class `min-w-0` مع إضافة `min-h-[1px]` لضمان أبعاد إيجابية دائماً. وحذف `minHeight: 0` نهائياً.

## الملفات والتغييرات

| # | الملف | التغيير |
|---|-------|---------|
| 1 | `DashboardCharts.tsx` (سطر 48, 74) | `style={{ minWidth: 0, minHeight: 0 }}` → `className="min-w-0 min-h-[1px]"` |
| 2 | `WaqifChartsInner.tsx` (سطر 30, 45) | `style={{ minWidth: 0 }}` → `className="h-[280px] min-w-0 min-h-[1px]"` (دمج مع class الموجود) |
| 3 | `IncomeComparisonChart.tsx` (سطر 36) | `style={{ minWidth: 0 }}` → إضافة `min-h-[1px]` للـ className |
| 4 | `ReportsChartsInner.tsx` (سطر 24, 41) | `style={{ minWidth: 0 }}` → `className="min-w-0 min-h-[1px]"` |
| 5 | `CashFlowReport.tsx` (سطر 129) | `style={{ minWidth: 0 }}` → إضافة `min-h-[1px]` |
| 6 | `IncomeMonthlyChart.tsx` (سطر 100) | `style={{ minWidth: 0 }}` → إضافة `min-h-[1px]` |
| 7 | `YoYChartsSection.tsx` (سطر 37, 59) | `style={{ minWidth: 0 }}` → إضافة `min-h-[1px]` |
| 8 | `MonthlyPerformanceReport.tsx` (سطر 134, 163) | `style={{ minWidth: 0 }}` → إضافة `min-h-[1px]` |
| 9 | `FinancialChartsInner.tsx` | لا يحتاج تغيير (لا يستخدم minWidth: 0 على الحاويات) |

## مثال التغيير

```tsx
// قبل
<div style={{ minWidth: 0, minHeight: 0 }}>
  <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>

// بعد
<div className="min-w-0 min-h-[1px]">
  <ResponsiveContainer width="100%" height={300} minWidth={1} minHeight={1}>
```

## لماذا هذا يعمل
- `min-w-0` (Tailwind) = `min-width: 0px` — يمنع تجاوز الحاوية في flex/grid (نفس الوظيفة السابقة)
- `min-h-[1px]` = `min-height: 1px` — يضمن أن الحاوية لا تنكمش أبداً إلى 0 ارتفاع
- الحاويات التي لديها `h-[280px]` أو `h-[300px]` بالفعل محمية، لكن إضافة `min-h-[1px]` تحمي اللحظة الأولى قبل حساب CSS

