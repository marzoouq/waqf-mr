

## تحليل: تحسين حزم vendor-pdf و vendor-recharts

### الوضع الحالي — أفضل مما يبدو

**vendor-pdf (583KB):**
- جميع استيرادات jsPDF في كود الإنتاج هي `import type` فقط (لا تُحمّل في الحزمة)
- الاستيراد الفعلي يتم عبر `dynamic import` داخل دوال التصدير عند الطلب
- ✅ **محسّن بالفعل** — الحزمة لا تُحمّل إلا عند طلب تصدير PDF فعلياً

**vendor-recharts (340KB):**
- الصفحات التي تستخدمه مُحمّلة كسولاً (`lazyWithRetry`) في App.tsx ← الحزمة لا تُحمّل مع التحميل الأولي
- بعض المكونات داخل الصفحات الكسولة مُحمّلة كسولاً أيضاً (مثل `DashboardCharts`, `IncomeMonthlyChart`, `CollectionSummaryChart`)
- ⚠️ **يوجد تحسين ممكن**: 4 مكونات recharts مستوردة استاتيكياً داخل صفحاتها:

| المكون | مُستورد في |
|--------|-----------|
| `CashFlowReport` | `ReportsPage.tsx` (سطر 3) |
| `MonthlyPerformanceReport` | `ReportsPage.tsx` (سطر 14) |
| `IncomeComparisonChart` | `AnnualReportPage.tsx` + `AnnualReportViewPage.tsx` |
| `YoYChartsSection` | `YearOverYearComparison.tsx` (سطر 12) |

### التحسين المقترح

تحويل هذه المكونات الأربعة إلى `lazy` import داخل صفحاتها، مما يؤخّر تحميل recharts حتى يظهر المكون فعلياً (مثلاً عند التمرير أو فتح تبويب):

**1. `ReportsPage.tsx`** — تحويل استيرادين:
```ts
// قبل
import CashFlowReport from '@/components/reports/CashFlowReport';
import MonthlyPerformanceReport from '@/components/reports/MonthlyPerformanceReport';

// بعد
const CashFlowReport = lazy(() => import('@/components/reports/CashFlowReport'));
const MonthlyPerformanceReport = lazy(() => import('@/components/reports/MonthlyPerformanceReport'));
```
(الصفحة تستخدم `lazy` و `Suspense` بالفعل — لا حاجة لاستيراد إضافي)

**2. `AnnualReportPage.tsx`** — تحويل استيراد واحد:
```ts
const IncomeComparisonChart = lazy(() => import('@/components/annual-report/IncomeComparisonChart'));
```
مع إضافة `Suspense` + fallback حول الاستخدام.

**3. `AnnualReportViewPage.tsx`** — نفس التحويل لـ `IncomeComparisonChart`.

**4. `YearOverYearComparison.tsx`** — تحويل `YoYChartsSection`:
```ts
const YoYChartsSection = lazy(() => import('@/components/reports/YoYChartsSection'));
```

### الأثر المتوقع

- **التحميل الأولي**: لا تغيير (الحزمة أصلاً لا تُحمّل مع الصفحة الرئيسية)
- **عند فتح صفحة التقارير/التقرير السنوي**: تحميل أسرع للصفحة نفسها، مع تأجيل الرسوم البيانية حتى تظهر
- **vendor-pdf**: لا تغيير مطلوب — محسّن بالفعل

### ملاحظة
الحجمان (583KB, 340KB) هما حجم الحزمة **غير مضغوطة**. بعد gzip تكون أصغر بكثير (~150KB و ~100KB). والحزمتان أصلاً **لا تُحمّلان مع التحميل الأولي** بفضل lazy loading على مستوى الصفحات.

