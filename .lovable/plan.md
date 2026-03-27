

## تحويل DashboardCharts و IncomeMonthlyChart إلى lazy import

### الوضع الحالي
كلا المكوّنين **محمّلان بالفعل بـ lazy على مستوى الصفحة** (`AdminDashboard` و `IncomePage`)، لكنهما يستوردان recharts مباشرة في أعلى الملف. تطبيق نفس نمط Inner المُستخدم في التقارير يفصل recharts عن منطق البيانات ويوحّد المعمارية.

### التغييرات

**ملف واحد:** `supabase/functions/zatca-api/index.ts` — لا، هذا عن الرسوم البيانية:

#### 1. `DashboardCharts` → Inner
- **إنشاء** `src/components/dashboard/DashboardChartsInner.tsx`
  - نقل كل كود recharts (BarChart + PieChart) + الثوابت (`COLORS`, `ARABIC_MONTHS`, `formatArabicMonth`, `tooltipStyle`)
  - يستقبل نفس الـ props: `monthlyData` + `expenseTypes`

- **تعديل** `src/components/dashboard/DashboardCharts.tsx`
  - يصبح wrapper خفيف: `lazy(() => import('./DashboardChartsInner'))` + `Suspense` مع `Skeleton`
  - يحتفظ بـ Card shells + حالة "لا توجد بيانات"، أو ينقل كل شيء للـ Inner ويبقى كغلاف Suspense فقط

#### 2. `IncomeMonthlyChart` → Inner
- **إنشاء** `src/components/dashboard/IncomeMonthlyChartInner.tsx`
  - نقل كود recharts (BarChart + ResponsiveContainer + Tooltip + Legend)
  - يستقبل: `chartData` + `achievementRate` (البيانات المحسوبة)

- **تعديل** `src/components/dashboard/IncomeMonthlyChart.tsx`
  - يبقى فيه: `useMemo` لحساب `chartData` + `totalActual/totalExpected/achievementRate`
  - يحمّل `IncomeMonthlyChartInner` بـ `lazy` + `Suspense`
  - Card + Header يبقيان في الملف الأصلي (عرض فوري)

### ملف واحد لكل تحويل — المجموع: إنشاء 2 ملف + تعديل 2 ملف

### ملاحظات تقنية
- نفس النمط المُطبّق سابقاً على `CashFlowChartInner`, `YoYChartsSectionInner`, إلخ
- `minWidth={1} minHeight={1}` على كل `ResponsiveContainer`
- `min-w-0 min-h-[1px]` على الحاوية الأب
- لا تغيير في المنطق أو السلوك

