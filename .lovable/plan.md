

# إصلاح تحذيرات Recharts: إضافة `minHeight={1}` لجميع `ResponsiveContainer`

## المشكلة
تحذير `width(-1) and height(-1)` لا يزال يظهر في الكونسول رغم إصلاح `ChartContainer`. السبب: **11 ملف** يستخدمون `ResponsiveContainer` مباشرة (بدون `ChartContainer`) وجميعهم يفتقدون `minHeight={1}`.

التحذير يقول صراحة: `minHeight(undefined)` — أي أن الخاصية غير مُعيّنة.

## لوحة التحكم
لوحة التحكم تعرض البيانات بشكل صحيح (KPIs، جدول شهري، عقود، أداء الصفحات). لا أخطاء في الشبكة.

## التغييرات المطلوبة

إضافة `minHeight={1}` لكل `ResponsiveContainer` في الملفات التالية:

| # | الملف | عدد المواقع |
|---|-------|-------------|
| 1 | `src/components/financial/FinancialChartsInner.tsx` | 6 |
| 2 | `src/components/dashboard/DashboardCharts.tsx` | 2 |
| 3 | `src/components/dashboard/IncomeMonthlyChart.tsx` | 1 |
| 4 | `src/components/dashboard/CollectionSummaryChart.tsx` | 1 |
| 5 | `src/components/reports/YoYChartsSection.tsx` | 4 |
| 6 | `src/components/reports/HistoricalComparisonChartInner.tsx` | 1 |
| 7 | `src/components/annual-report/IncomeComparisonChart.tsx` | 1 |
| 8 | `src/components/waqif/WaqifChartsInner.tsx` | 2 (هذه تستخدم `minWidth={0}` — تحتاج تصحيح إلى `minWidth={1} minHeight={1}`) |
| 9 | `src/components/expenses/ExpensePieChartInner.tsx` | 1 (لديها `minHeight={280}` — مقبولة، لكن يُفضّل إضافة التناسق) |

**ملاحظة**: `src/components/ui/chart.tsx` مُصلح سابقاً ✅

## التغيير في كل ملف
بسيط: إضافة `minHeight={1}` بجانب `minWidth={1}` في كل `ResponsiveContainer`.

مثال:
```tsx
// قبل
<ResponsiveContainer width="100%" height={250} minWidth={1}>

// بعد
<ResponsiveContainer width="100%" height={250} minWidth={1} minHeight={1}>
```

