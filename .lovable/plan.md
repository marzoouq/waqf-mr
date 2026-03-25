

# إصلاح تحذير `ResponsiveContainer` — أبعاد -1

## المشكلة
مكتبة Recharts تطبع تحذيرات متكررة لأن `ResponsiveContainer` يحسب أبعاد الحاوية كـ `-1` قبل أن يكتمل تصيير العنصر الأب. الحل: إضافة `minWidth={1}` لكل `ResponsiveContainer` مفقود منها.

## التغييرات

| الملف | التعديل |
|-------|---------|
| `src/components/dashboard/DashboardCharts.tsx` | إضافة `minWidth={1}` لـ `ResponsiveContainer` (سطران 49، 75) |
| `src/components/dashboard/IncomeMonthlyChart.tsx` | إضافة `minWidth={1}` (سطر 100) |
| `src/components/dashboard/CollectionSummaryChart.tsx` | إضافة `minWidth={1}` (سطر 36) |
| `src/components/reports/CashFlowReport.tsx` | إضافة `minWidth={1}` + `style={{ minWidth: 0 }}` للـ div الأب (سطر 129-130) |
| `src/components/reports/MonthlyPerformanceReport.tsx` | إضافة `minWidth={1}` (سطران 135، 164) |
| `src/components/annual-report/IncomeComparisonChart.tsx` | إضافة `minWidth={1}` (سطر 37) |
| `src/components/expenses/ExpensePieChartInner.tsx` | تغيير `minWidth={0}` → `minWidth={1}` (سطر 27) |

**7 ملفات — تعديل بسيط ومتسق لكل منها.**

