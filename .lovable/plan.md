

# إصلاح تحذير Recharts المتبقي

## المشكلة
تحذير `width(-1) and height(-1)` لا يزال يظهر في الكونسول. بعد مراجعة جميع الملفات، تبيّن أن **ملفاً واحداً فاته الإصلاح السابق**:

**`src/components/reports/CashFlowReport.tsx`** — سطر 130:
```tsx
// الحالي (بدون minHeight)
<ResponsiveContainer width="100%" height="100%" minWidth={1}>

// المطلوب
<ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
```

## الحالة الكاملة
| الملف | الحالة |
|-------|--------|
| `chart.tsx` (ChartContainer) | ✅ مُصلح |
| `DashboardCharts.tsx` | ✅ مُصلح |
| `IncomeMonthlyChart.tsx` | ✅ مُصلح |
| `CollectionSummaryChart.tsx` | ✅ مُصلح |
| `FinancialChartsInner.tsx` | ✅ مُصلح |
| `YoYChartsSection.tsx` | ✅ مُصلح |
| `HistoricalComparisonChartInner.tsx` | ✅ مُصلح |
| `IncomeComparisonChart.tsx` | ✅ مُصلح |
| `WaqifChartsInner.tsx` | ✅ مُصلح |
| `ExpensePieChartInner.tsx` | ✅ مُصلح |
| **`CashFlowReport.tsx`** | ❌ **مفقود — يحتاج إصلاح** |

## التغيير
إضافة `minHeight={1}` في سطر 130 من `CashFlowReport.tsx`.

