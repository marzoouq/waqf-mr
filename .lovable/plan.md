

# تحليل حجم حزم الإنتاج (Production Bundle)

## الوضع الحالي

التقسيم الحالي في `vite.config.ts` ممتاز ويفصل 17 حزمة vendor. كل الصفحات تُحمَّل كسولاً عبر `lazyWithRetry`. لكن يوجد فرص تحسين:

---

## المشاكل المكتشفة

### 1. recharts مستورد مباشرة في 4 صفحات (لا يُحمَّل كسولاً)
هذه الصفحات تستورد recharts مباشرة بدل تغليف الرسوم في مكوّنات كسولة:
- `ReportsPage.tsx` — استيراد مباشر لـ 11 مكوّن من recharts
- `HistoricalComparisonPage.tsx` — استيراد مباشر
- `WaqifDashboard.tsx` — استيراد مباشر
- `FinancialReportsPage.tsx` — استيراد مباشر

بينما `AdminDashboard` و `ExpensesPieChart` يستخدمان `lazy()` بشكل صحيح.

**الأثر**: حزمة `vendor-charts` (recharts + d3) تُسحب مع أي صفحة تستورد مباشرة، حتى لو المستخدم لم يمرر للرسم البياني.

### 2. jsPDF مستورد مباشرة في 13 ملف PDF
ملفات `src/utils/pdf/*.ts` تستورد `jsPDF` و `jspdf-autotable` مباشرة. لكن بما أن هذه الملفات تُستدعى فقط عند الضغط على زر التصدير، فالتقسيم الحالي (`vendor-pdf`) يعمل بشكل صحيح لأن Vite يقسمها تلقائياً. لا حاجة لتغيير.

### 3. مكتبات Radix UI كحزمة واحدة
~25 مكوّن Radix مجمعة في `vendor-radix`. يمكن تقسيمها لكن الفائدة محدودة لأن معظمها صغيرة.

---

## خطة التحسين (أولوية عالية فقط)

### الملفات المتأثرة
- `src/pages/dashboard/ReportsPage.tsx`
- `src/pages/dashboard/HistoricalComparisonPage.tsx`
- `src/pages/beneficiary/WaqifDashboard.tsx`
- `src/pages/beneficiary/FinancialReportsPage.tsx`

### التغيير
استخراج مكونات الرسوم البيانية من هذه الصفحات الأربع إلى مكونات منفصلة تُحمَّل كسولاً بنفس نمط `ExpensePieChartInner`:

1. **ReportsPage** — استخراج رسوم الدخل/المصروفات والرسم الدائري إلى مكوّن `ReportsCharts` كسول
2. **HistoricalComparisonPage** — استخراج رسم المقارنة التاريخية إلى مكوّن كسول
3. **WaqifDashboard** — استخراج الرسوم إلى مكوّن كسول
4. **FinancialReportsPage** — استخراج الرسوم إلى مكوّن كسول

هذا يضمن أن حزمة `vendor-charts` (~150KB) لا تُحمَّل إلا عند الحاجة الفعلية.

### التفاصيل التقنية

```text
قبل:  الصفحة → import recharts → vendor-charts يُحمَّل مع الصفحة
بعد:   الصفحة → lazy(() => import('./ChartComponent')) → vendor-charts يُحمَّل عند العرض
```

لن يُحدث تغيير في `vite.config.ts` — التقسيم الحالي ممتاز. التحسين فقط في طريقة الاستيراد.

