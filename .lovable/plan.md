# خطة: اختبارات انحدار شاملة للوحات الناظر/المستفيد/المحاسب

## الهدف
بناء طبقة انحدار **متعددة المستويات** تضمن:
1. كل صفحة في اللوحات الثلاث تُحمَّل دون أخطاء تحت تغييرات الصلاحيات والأقسام.
2. كل صفحة مربوطة بمصدر البيانات الصحيح (page-hook الخاص بها) ولا تستهلك بيانات صفحة أخرى.
3. تغيير أي قسم/صلاحية لا يكسر التنقل أو الصفحة الموجَّه إليها.

## الوضع الحالي
- يوجد بالفعل ~30 اختبار صفحة محددة (`*.test.tsx`) لكنّ **7 صفحات بلا اختبار**:
  - ناظر: `AnnualReportPage`, `ChartOfAccountsPage`, `EmailMonitorPage`, `HistoricalComparisonPage`, `SystemDiagnosticsPage`.
  - مستفيد: `AnnualReportViewPage`, `ExpensesViewPage`.
- الاختبارات الحالية تتحقق من العرض فقط، لا تختبر تكامل الصلاحيات.

## الملفات الجديدة

### A) اختبارات الصفحات الناقصة (7 ملفات smoke)
لكل صفحة من السبع: ملف اختبار خفيف يحاكي الـ page-hook الخاص بها ويتأكد أنها:
- تُعرض دون رمي خطأ.
- تستدعي الـ page-hook المتوقع (تأكيد ربط البيانات بالمصدر الصحيح).
- تعرض عنواناً عربياً صحيحاً.

النمط نفس `InvoicesPage.test.tsx` (mocks ضيقة + render + assertion على العنوان والمكونات الرئيسية).

```
src/pages/dashboard/AnnualReportPage.test.tsx
src/pages/dashboard/ChartOfAccountsPage.test.tsx
src/pages/dashboard/EmailMonitorPage.test.tsx
src/pages/dashboard/HistoricalComparisonPage.test.tsx
src/pages/dashboard/SystemDiagnosticsPage.test.tsx
src/pages/beneficiary/AnnualReportViewPage.test.tsx
src/pages/beneficiary/ExpensesViewPage.test.tsx
```

### B) `src/test/dashboardRoutesContract.test.ts` — عقد ربط البيانات
اختبار ميتا يفحص نصياً أن كل صفحة في `ADMIN_ROUTES` و`BENEFICIARY_ROUTES`:
- ملف الصفحة موجود فعلاً تحت `src/pages/`.
- الصفحة تستورد على الأقل page-hook واحد من `@/hooks/page/` **أو** هي صفحة تجميعية معروفة (whitelist).
- لا تستورد مباشرة من `@/integrations/supabase/client` (يجب المرور عبر hooks/data).

هذا يثبّت **Page Hook Pattern** كقاعدة قابلة للقياس.

### C) `src/test/permissionsResilience.test.tsx` — مرونة الصلاحيات
سيناريوهات مصفوفية مع mocking لـ `useAuth/useSectionsVisibility/useRolePermissions`:

| سيناريو | توقع |
|---------|------|
| ناظر: كل الأقسام ظاهرة | كل روابط `ADMIN_ROUTES` موجودة عدا `/beneficiary` (مفتاح user) |
| ناظر: إخفاء كل قسم اختياري | `settings` و`users` يبقيان (PROTECTED) |
| محاسب: لا توجد صلاحيات صريحة | روابطه الافتراضية تظهر، والمستثناة (settings/users/zatca/diagnostics/email-monitor) محذوفة |
| محاسب: صلاحية واحدة `properties:false` | الرابط محذوف، بقية الروابط سليمة |
| مستفيد: invoices=false | `/beneficiary/invoices` محذوف، `/beneficiary/expenses` يبقى (دليل الفصل) |
| واقف: روابط مقتصرة على ما يخصه | `/waqif` ضمن النتائج، لا يظهر `/beneficiary/messages` إن لم يكن لديه صلاحية |

كل سيناريو يفحص قائمة `to[]` الناتجة عن `useNavLinks` ضد قائمة متوقعة محسوبة من `ADMIN_ROUTES`/`BENEFICIARY_ROUTES` و`PROTECTED_ADMIN_SECTIONS`.

### D) `src/test/pageHookBindingContract.test.ts` — ربط page → page-hook
خريطة صريحة `Page → expectedHook` تشمل ~12 صفحة رئيسية في اللوحات الثلاث:
- ناظر: `InvoicesPage → useInvoicesPage`, `ExpensesPage → useExpensesPage`, `BeneficiariesPage → useBeneficiariesPage`, `ContractsPage → useContractsPage`, `ReportsPage → useReportsPage`, `AccountsPage → useAccountsPage`.
- مستفيد: `InvoicesViewPage → useInvoicesViewPage`, `ExpensesViewPage → useExpensesViewPage`, `MySharePage → useMyShare*`, `AccountsViewPage → useAccountsViewPage`, `FinancialReportsPage → useFinancialReports*`, `CarryforumardHistoryPage → useCarryforward*`.

يقرأ الملف ويتأكد من وجود `import.*<hook>` و`<hook>(`. يمنع انحراف صفحة المستفيد لاستهلاك hook الناظر (وهو الخلل التاريخي الذي صَلَحَ مع آخر الفصل).

## الملفات المعدّلة
- لا تعديل على كود الإنتاج.
- قد نضيف export صغير لـ `BENEFICIARY_ROUTES`/`ADMIN_ROUTES` إن كانت داخلية (سنتحقق أولاً).

## نطاق المحاكاة (Mocking)
- نُحاكي page-hooks فقط بقيم فارغة معقولة (`data: []`, `isLoading: false`).
- نُحاكي `DashboardLayout`/`BeneficiaryLayout` لتجنّب تحميل الـ Sidebar والشبكة.
- نُحاكي `supabase/client` و`FiscalYearContext` بشكل موحَّد عبر `src/test/__helpers__/`.

## التحقق
- `bunx vitest run` على المجموعات الجديدة + الموجودة.
- جميع الاختبارات تمر في تشغيل واحد.

## خارج النطاق
- لا E2E بمتصفح حقيقي.
- لا اختبار للـ RLS أو Edge Functions (مغطّى سابقاً).
- لا إعادة هيكلة صفحات.

## ملاحظات قابلية التنفيذ
سأبدأ بـ **B + C + D** أولاً (قيمتها العالية ومستقلة)، ثم **A** (الصفحات السبع). إن كشف عقد B/D صفحات تستهلك بيانات خاطئة، أبلّغ بدل تعديلها صامتاً.
