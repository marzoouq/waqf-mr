

# خطة: إصلاح الاختبارات الفاشلة المتبقية

## تحليل الأسباب الجذرية

بعد فحص الملفات المصدرية وملفات الاختبار، إليك أسباب الفشل:

| الاختبار | السبب |
|----------|-------|
| **Sidebar.test.tsx** | يستخدم `useWaqfInfo` من `useAppSettings` ولم يتم تقديم mock لها |
| **BeneficiaryDashboard.test.tsx** | يستخدم `useTotalBeneficiaryPercentage` (hook جديد) بدون mock |
| **MySharePage.test.tsx** | يستخدم `useTotalBeneficiaryPercentage` بدون mock |
| **InvoicesPage.test.tsx** | يستخدم `usePdfWaqfInfo` و `useAppSettings` بدون mock كافٍ |
| **WaqifDashboard.test.tsx** | mock الـ `useFinancialSummary` ينقصه `income` و `expenses` arrays، والنص المتوقع `إجمالي الإيرادات` بينما الكود يعرض `إجمالي الدخل` |
| **ZatcaManagementPage.test.tsx** | لا يوجد mock لـ `DashboardLayout` — يحاول render كامل مع hooks غير مُمرَّرة |
| **DashboardLayout.test.tsx** | ينقصه mock لـ `useWaqfInfo` المستخدمة في `Sidebar` |

## التغييرات المطلوبة

### 1. `src/components/Sidebar.test.tsx`
- إضافة mock لـ `useWaqfInfo` في `@/hooks/useAppSettings`

### 2. `src/components/DashboardLayout.test.tsx`
- إضافة mock لـ `@/hooks/useAppSettings` يشمل `useWaqfInfo` (Sidebar يستدعيها)
- إضافة mock لمكونات إضافية: `BetaBanner`, `FiscalYearSelector`, `GlobalSearch`, `IdleTimeoutWarning`, `BottomNav`

### 3. `src/pages/beneficiary/BeneficiaryDashboard.test.tsx`
- إضافة mock لـ `useTotalBeneficiaryPercentage`
- إضافة mock لـ `@/integrations/supabase/client` (يستخدم supabase مباشرة)

### 4. `src/pages/beneficiary/MySharePage.test.tsx`
- إضافة mock لـ `useTotalBeneficiaryPercentage`

### 5. `src/pages/dashboard/InvoicesPage.test.tsx`
- إضافة mock لـ `useAppSettings` (مفقود)
- التحقق من أن `usePdfWaqfInfo` مُعرَّف

### 6. `src/pages/beneficiary/WaqifDashboard.test.tsx`
- إضافة mock لـ `DashboardLayout`
- إضافة mock لـ `SkeletonLoaders` و `NoPublishedYearsNotice` و `ExportMenu`
- تصحيح `useFinancialSummary` mock بإضافة `income: []` و `expenses: []`
- تصحيح النص المتوقع من `إجمالي الإيرادات` إلى `إجمالي الدخل`

### 7. `src/pages/dashboard/ZatcaManagementPage.test.tsx`
- إضافة mock لـ `DashboardLayout`
- إضافة mock لـ `useAppSettings` (يُستدعى من DashboardLayout)

## ترتيب التنفيذ
```text
1. إصلاح Sidebar.test.tsx (mock useWaqfInfo)
2. إصلاح DashboardLayout.test.tsx (mock useWaqfInfo + مكونات إضافية)
3. إصلاح BeneficiaryDashboard.test.tsx (mock useTotalBeneficiaryPercentage)
4. إصلاح MySharePage.test.tsx (mock useTotalBeneficiaryPercentage)
5. إصلاح InvoicesPage.test.tsx (mock useAppSettings)
6. إصلاح WaqifDashboard.test.tsx (mock DashboardLayout + تصحيح النصوص)
7. إصلاح ZatcaManagementPage.test.tsx (mock DashboardLayout)
```

