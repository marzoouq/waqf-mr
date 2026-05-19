## الهدف
توسيع `src/test/permissionsResilience.test.tsx` ليثبت — تبويباً تبويباً — أن مصدر بيانات كل صفحة في لوحات الناظر والمستفيد لا يتغير ولا يتسرّب بين الواجهتين تحت أي تركيبة صلاحيات.

## التغطية المضافة

### 1) مصفوفة "كل تبويب × حالة صلاحية" للوحة الناظر
لكل مسار في `ADMIN_ROUTES` (21 مساراً) نولّد ثلاث حالات:
- افتراضي → الرابط ظاهر
- `sectionKey=false` → الرابط محجوب (ما عدا `settings` و `users` المحميين)
- `permKey=false` → الرابط محجوب (إن وُجد `permKey`)
وفي كل حالة نتأكد أن بقية الروابط لم تتأثر (عدم تسرّب).

### 2) مصفوفة مماثلة للوحة المستفيد
كل مسار في `BENEFICIARY_ROUTES` (17 مساراً) بنفس المنطق + تأكيد خاص:
- إخفاء `invoices` لا يخفي `expenses` (الفصل المعماري)
- إخفاء `expenses` لا يخفي `invoices`
- إخفاء `share` لا يخفي `carryforward` (المفاتيح المستقلة #24)

### 3) عقد عدم التسرّب بين الواجهتين (Cross-surface isolation)
اختبار جديد يضمن:
- دور `admin/accountant` لا يُولّد أي رابط يبدأ بـ `/beneficiary` أو `/waqif`
- دور `beneficiary/waqif` لا يُولّد أي رابط يبدأ بـ `/dashboard`
- تحت كل تركيبات إخفاء الأقسام (حلقة على كل sectionKey)

### 4) ثبات مصدر البيانات (Page-hook stability)
توسيع `pageHookBindingContract.test.ts` بقائمة `forbidden` أشمل لكل صفحة:
- صفحات `/dashboard/*` يُمنع فيها استيراد أي hook ينتهي بـ `ViewPage` أو يبدأ بمسار `hooks/page/beneficiary/`
- صفحات `/beneficiary/*` يُمنع فيها استيراد أي hook من `hooks/page/admin/`
- فحص نصّي بـ regex على `from '@/hooks/page/(admin|beneficiary)/'` بدل قائمة hooks يدوية

### 5) ثبات الأعمدة/مكوّنات الجدول
اختبار خفيف يتأكد أن:
- `InvoicesPage` يستخدم `InvoicesViewDesktopTable` ولا يستورد أي مكوّن من `components/expenses/*`
- `ExpensesPage` لا يستورد أي مكوّن من `components/invoices/*`
- `InvoicesViewPage` (beneficiary) لا يستورد مكوّنات من صفحة الناظر الخاصة (مثل أزرار التعديل/الحذف)

## الملفات

- تعديل: `src/test/permissionsResilience.test.tsx` — إضافة 3 أقسام `describe` جديدة (مصفوفة الناظر، مصفوفة المستفيد، عقد العزل بين الواجهتين)
- تعديل: `src/test/pageHookBindingContract.test.ts` — تعميم الحظر عبر regex على مسارات الـ hooks
- إنشاء: `src/test/surfaceComponentIsolation.test.ts` — فحص استيراد المكوّنات بين الواجهتين
- تعديل: `.lovable/plan.md` — توثيق التغطية الجديدة

## ضمانات
- لا تغييرات في كود الإنتاج
- كل الاختبارات بـ Vitest، تعتمد على mocks الحالية لـ `useAuth/useAppSettings/useSectionsVisibility/useRolePermissions`
- التشغيل: `bunx vitest run src/test/permissionsResilience src/test/pageHookBindingContract src/test/surfaceComponentIsolation`
