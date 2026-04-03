
# خطة تحسين أداء جميع الصفحات

## التحليل الحالي

### ✅ ما هو جيد بالفعل
- **Lazy loading** مطبق على كل الصفحات عبر `lazyWithRetry`
- **DeferredRender** مُستخدم في AdminDashboard (5 مكونات مؤجلة)
- **staleTime** مُعرّف مركزياً عبر `queryStaleTime.ts`
- **Prefetch** عند hover على روابط Sidebar
- **Lazy components** داخلية في WaqifDashboard وFinancialReportsPage
- **useMemo** مُستخدم في الحسابات الثقيلة

### 🔴 المشاكل المكتشفة

| # | المشكلة | التأثير | الصفحات المتأثرة |
|---|---------|---------|------------------|
| 1 | **BeneficiaryDashboard** لا يستخدم `DeferredRender` لأي مكون | تحميل أولي ثقيل (200 سطر، 6 مكونات فرعية) | لوحة المستفيد |
| 2 | **WaqifDashboard** لا يستخدم `DeferredRender` — فقط `lazy` للرسوم البيانية | الحسابات والمكونات الثانوية تُرندر فوراً | لوحة الواقف |
| 3 | **لا يوجد `useIsDesktop`** في أي صفحة — الموبايل والديسكتوب يُرندران معاً | DOM مضاعف على الهواتف | كل الصفحات |
| 4 | **`vendor-recharts` = 350 KB gzipped 98 KB** — أثقل chunk بعد PDF | بطء تحميل أولي لصفحات الرسوم البيانية | AdminDashboard, WaqifDashboard, Reports, Financial |
| 5 | **`vendor-html2canvas` = 201 KB** يُحمّل حتى لو لم يُستخدم في الصفحة | overhead غير ضروري | - |
| 6 | **`AccountsPage` = 85 KB, `ContractsPage` = 89 KB** — أضخم chunks للصفحات | يمكن تجزئة الأقسام الثقيلة | الحسابات، العقود |

## خطة التنفيذ

### 1. إضافة `DeferredRender` لـ BeneficiaryDashboard
- تأجيل `BeneficiaryAdvanceCard` (delay: 1000)
- تأجيل `BeneficiaryRecentDistributions` + `BeneficiaryNotificationsCard` (delay: 1500)

### 2. إضافة `DeferredRender` لـ WaqifDashboard
- تأجيل `WaqifFinancialSection` (delay: 1000)
- تأجيل الرسوم البيانية (delay: 1500)
- تأجيل `WaqifQuickLinks` (delay: 2000)

### 3. تطبيق `useIsMobile` في الصفحات الثقيلة التي تعرض محتوى مختلف للموبايل/ديسكتوب
- فحص AccountsPage, ContractsPage, AdminDashboard لتفعيل العرض المشروط

### 4. تأجيل `html2canvas` — التأكد أنه lazy فقط عند الحاجة
- فحص من يستورده وضمان أنه `lazy(() => import(...))`

### 5. إضافة `CollapsibleSection` للأقسام الثانوية في الصفحات الطويلة
- AccountsPage: الجداول التفصيلية (المصروفات، التوزيعات)
- ReportsPage: الأقسام الاختيارية

### 6. تحقق نهائي بالبناء والمقارنة
