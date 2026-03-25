

# تحليل وتقليل أحجام chunks الكبيرة

## الوضع الحالي

| Chunk | الحجم | المحتويات |
|---|---|---|
| `vendor-pdf` | ~582KB | `jspdf` + `canvg` + `rgbcolor` + `stackblur-canvas` |
| `vendor-charts` | ~402KB | `recharts` + `d3-*` + `victory-vendor` |

## التحليل

### vendor-pdf (582KB)
- **8 ملفات** تستورد `jspdf` مباشرة في `src/utils/pdf/`
- معظم الاستخدامات تتم عبر **dynamic import** (`await import('@/utils/pdf')`) — وهذا جيد
- **لكن** `src/utils/pdf/core.ts` يستورد `jsPDF` بشكل ثابت (static import) في السطر الأول
- `InvoicePreviewDialog.tsx` يستخدم dynamic import بشكل صحيح
- **المشكلة الرئيسية**: `core.ts` هو نقطة الدخول المشتركة — إذا استورده أي ملف بشكل ثابت سيسحب كامل jsPDF

### vendor-charts (402KB)
- **12 ملف** يستورد من `recharts` بشكل ثابت
- بعضها محمّل كسولاً (WaqifChartsInner, FinancialChartsInner, ReportsChartsInner, HistoricalComparisonChartInner, ExpensePieChartInner)
- **3 ملفات في Dashboard غير كسولة بشكل كامل**:
  - `DashboardCharts.tsx` — محمّل كسولاً ✅
  - `CollectionSummaryChart.tsx` — محمّل كسولاً ✅
  - `IncomeMonthlyChart.tsx` — **مستورد بشكل ثابت** في `IncomePage.tsx` ❌
- `MonthlyPerformanceReport.tsx`, `CashFlowReport.tsx`, `YoYChartsSection.tsx`, `IncomeComparisonChart.tsx` — مستوردة في صفحات lazy-loaded فتُحمّل مع الصفحة

## الخطة المقترحة

### 1. تقليل vendor-pdf — Dynamic import لـ jsPDF في core.ts

**الملف:** `src/utils/pdf/core.ts`
- تغيير `import jsPDF from 'jspdf'` إلى dynamic import داخل `createPdfDocument()`
- هذا يضمن أن `vendor-pdf` يُحمّل فقط عند طلب توليد PDF فعلياً
- **التأثير المتوقع**: إزالة 582KB من الحزمة الأولية بالكامل (يُحمّل on-demand فقط)

### 2. تقليل vendor-charts — تحميل كسول لـ IncomeMonthlyChart

**الملف:** `src/pages/dashboard/IncomePage.tsx`
- تغيير `import IncomeMonthlyChart` من static إلى `lazy(() => import(...))`
- لف المكوّن بـ `<Suspense>`

### 3. تقسيم vendor-charts في vite.config.ts

**الملف:** `vite.config.ts`
- فصل `d3-*` عن `recharts` في `manualChunks`:
  - `vendor-recharts` → `recharts` + `victory-vendor` (~200KB)
  - `vendor-d3` → `d3-*` (~200KB)
- هذا يسمح بتحميل متوازٍ وتخزين مؤقت أفضل

### الملخص

| الإجراء | التأثير |
|---|---|
| Dynamic import لـ jsPDF في core.ts | vendor-pdf (582KB) يُحمّل فقط عند توليد PDF |
| Lazy load لـ IncomeMonthlyChart | يقلل الحزمة الأولية لصفحة الدخل |
| فصل d3 عن recharts | تحميل متوازٍ + تخزين مؤقت أفضل |

