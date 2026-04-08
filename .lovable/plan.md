

# خطة إضافة الاختبارات — 3 ملفات (مُحدَّثة)

## ما تم حذفه من الخطة الأصلية

- **`safeNumber.test.ts`**: موجود فعلاً في `src/utils/format/safeNumber.test.ts` بتغطية كاملة (13 حالة). لا حاجة لإنشائه.

## الملفات المطلوب إنشاؤها

### 1. `src/test/distributionSummary.test.ts`

اختبار `filterDistributionsByFiscalYear` (9 حالات) و `summarizeDistributions` (5 حالات):

**filter:**
- `hasAccount=true` → الكل (3 حالات فرعية: بدون FY، مع FY، مع 'all')
- `hasAccount=false, fiscalYearId='fy-1'` → 2 فقط
- `hasAccount=false, fiscalYearId='fy-2'` → 1 فقط
- `hasAccount=false, fiscalYearId='fy-999'` → `[]`
- `hasAccount=false, fiscalYearId=undefined` → `[]` (الإصلاح #2)
- `hasAccount=false, fiscalYearId=null` → `[]` (الإصلاح #2)
- `hasAccount=false, fiscalYearId='all'` → `[]` (السلوك الحالي — 'all' لا يمر من الشرط)
- مصفوفة فارغة → `[]`

**summarize:**
- paid فقط → `totalReceived`
- pending فقط → `pendingAmount`
- حالات أخرى (other/cancelled) → تُتجاهل
- مصفوفة فارغة → أصفار
- قيم `null`/`NaN` في amount → تُعامل كـ 0 عبر `safeNumber`

### 2. `src/test/fiscalYearIds.test.ts`

15 حالة اختبار لـ `isFyReady` (6)، `isFyAll` (4)، `isFySpecific` (5).

### 3. إضافة حالة regression إلى `src/test/regressionFixes.test.ts`

إضافة `describe` جديد في نهاية الملف يوثّق إصلاح #2 لـ `filterDistributionsByFiscalYear`:
- `hasAccount=false, undefined` → `[]`
- `hasAccount=false, 'all'` → `[]`

### 4. تشغيل الاختبارات والتحقق

`npx vitest run --reporter=verbose` للتأكد من نجاح جميع الاختبارات.

