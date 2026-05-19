
# خطة تنفيذ P0+P1 — صلاحيات الناظر وفصل الفواتير وتوحيد منطق المحاسب

## الأهداف
1. تمكين الناظر من إخفاء/إظهار أي صفحة في كل لوحة، مع حماية صفحات حرجة من القفل الذاتي.
2. فصل دلالي ووظيفي بين **الفواتير الضريبية (ZATCA)** و**المصروفات التشغيلية**.
3. توحيد قاعدة صلاحيات المحاسب لإزالة التعارض بين القائمة الجانبية وحارس المسارات.

---

## المهمة 1 — توسيع صلاحيات إخفاء الصفحات (P1)

### 1.1 توسيع `ADMIN_SECTION_KEYS`
ملف: `src/constants/sections.ts`
- إضافة المفاتيح المفقودة: `zatca`, `diagnostics`, `email_monitor`, `comparison`, `settings`, `users` (موجود).
- إضافة label لكل مفتاح جديد في `SECTION_LABELS`.

### 1.2 إنشاء `PROTECTED_ADMIN_SECTIONS`
ملف: `src/constants/sections.ts`
```text
export const PROTECTED_ADMIN_SECTIONS = ['settings', 'users'] as const;
```
- هذه الأقسام تظهر في UI الإعدادات لكن Switch الخاص بها مُعطّل ودائماً `true`.

### 1.3 ربط `sectionKey` لكل مسار في `routeRegistry.ts`
- إضافة `sectionKey` لمسارات: `/dashboard/zatca`, `/dashboard/settings`, `/dashboard/comparison`, `/dashboard/diagnostics`, `/dashboard/email-monitor`, `/dashboard/users`.

### 1.4 تحديث `defaultAdminSections`
ملف: `src/constants/navigation.ts`
- ضمان أن المفاتيح الجديدة موجودة بقيمة `true` افتراضياً (تجنّب اختفاء صفحات بعد deploy).

### 1.5 حارس الـ Hook
ملف: `src/hooks/data/settings/useSectionsVisibility.ts`
- بعد دمج إعدادات DB، إجبار `PROTECTED_ADMIN_SECTIONS` على `true` دائماً قبل الإرجاع.

### 1.6 واجهة التحكم
ملف: `src/components/settings/permissions/SectionsTab.tsx` (موجود)
- التأكد أنه يقرأ من `ADMIN_SECTION_KEYS` الموسّع.
- تعطيل Switch لأي مفتاح في `PROTECTED_ADMIN_SECTIONS` مع tooltip "صفحة محمية لا يمكن إخفاؤها".

### معايير القبول
- الناظر يستطيع إخفاء/إظهار كل صفحة من Sidebar (admin + accountant + beneficiary).
- `settings` و `users` غير قابلة للإخفاء حتى بتعديل DB يدوياً.
- بعد إخفاء صفحة، يختفي رابطها من Sidebar وBottomNav ويُرجع `RequirePermission` صفحة Unauthorized عند زيارة URL مباشرة.

---

## المهمة 2 — إعادة تسمية `InvoiceSourceFilter` (P0)

### 2.1 تغيير النوع
ملف: `src/types/invoices.ts`
```text
export type InvoiceSourceFilter = 'all' | 'purchase' | 'rent';
export interface UnifiedInvoiceItem { ...; source: 'purchase' | 'rent'; }
```

### 2.2 استبدال جميع الاستخدامات
ملفات: `useInvoicesPage.ts`, `useInvoicesViewPage.ts`, `InvoicesPage.tsx`, `InvoicesViewPage.tsx`, أي tests.
- `'expense'` → `'purchase'` في كل القيم، التبويبات، الفلاتر.
- تحديث نصوص UI: "فواتير الشراء" (موجودة بالفعل في InvoicesPage).

### 2.3 ESLint guard
- إضافة قاعدة `no-restricted-syntax` تمنع السلسلة الحرفية `'expense'` كقيمة لـ `InvoiceSourceFilter`.

### معايير القبول
- لا توجد إشارة لـ `'expense'` كـ source في كود الفواتير.
- جميع الاختبارات تمر.

---

## المهمة 3 — فصل الفواتير عن المصروفات (P0)

### 3.1 الفصل في طبقة البيانات
- `ExpensesPage.tsx` و `useExpensesPage.ts`: لا يستوردان أي شيء من `@/components/invoices` أو `useInvoicesPage`.
- `InvoicesPage.tsx`: لا يستورد `ExpenseSummaryCards` أو `@/components/expenses/*`.
- توحيد مصدر القراءة في `useInvoicesPage` على جدول `invoices` (بنوعَيه) + `payment_invoices`، بينما `useExpensesPage` يبقى على جدول `expenses` فقط.

### 3.2 إزالة الـ writes المشتركة
- `InvoiceUploadDialog`: حذف أي حقل/منطق يربط الفاتورة بسجل مصروف (`expense_id`).
- إنشاء فاتورة شراء عبر هذه الواجهة لا يُنشئ مصروفاً تلقائياً، والعكس صحيح.
- التزامن (إن وُجد) ينتقل إلى trigger DB موثّق منفصل — أو يُلغى مع توثيق صريح في memory.

### 3.3 لوحة المستفيد
- `ExpensesViewPage` يعرض حصراً سجلات `expenses` (تشغيلية، read-only).
- `InvoicesViewPage` يعرض حصراً مستندات `invoices` + `payment_invoices` (ZATCA، read-only).
- لا تكرار للسجل نفسه عبر الصفحتين.

### 3.4 تحديث النصوص والـ copy
- `beneficiaryCopy.ts`: عناوين/أوصاف الفواتير تقتصر على "المستندات الضريبية".
- `ExpensesPage` header: "المصروفات التشغيلية".

### 3.5 توثيق
- تحديث `mem://business-logic/finance/accounting-expenses-vs-tax-invoices` بحدود واضحة وعدم وجود ربط مباشر بين الجدولين على مستوى التطبيق.

### معايير القبول
- تعديل/حذف فاتورة لا يغيّر أي صف في جدول `expenses`، والعكس.
- ExpensesPage لا تعرض أي عنصر فاتورة، وInvoicesPage لا تعرض أي عنصر مصروف.
- المستفيد لا يرى نفس السجل في الصفحتين.

---

## المهمة 4 — توحيد منطق صلاحيات المحاسب (P0)

### 4.1 اختيار قاعدة موحّدة
**القرار:** اعتماد منطق **opt-out** (مسموح ما لم يكن `false` صراحةً) في كلا المسارين.
- متّسق مع `usePermissionCheck` الحالي.
- يمنع اختفاء روابط بسبب صف ناقص في `role_permissions`.

### 4.2 تعديل `filterLinksByPermissions`
ملف: `src/utils/auth/filterByVisibility.ts`
- تغيير السلوك: يُخفي الرابط **فقط** إذا `perms[permKey] === false`.
- إذا المفتاح غير موجود أو `undefined` → يُعرض.

### 4.3 تعديل `useNavLinks` للمحاسب
ملف: `src/hooks/application/useNavLinks.ts`
- تمرير `perms ?? {}` يبقى، لكن السلوك الجديد سيحترم opt-out.
- إضافة تعليق يربط بـ `usePermissionCheck` كمرجع وحيد.

### 4.4 اختبار
- إضافة test في `src/test/` يتحقق أن: محاسب بدون أي صف `role_permissions` يرى نفس المسارات التي يسمح بها `usePermissionCheck.isRouteAllowed`.
- اختبار حالة `false` صريحة على مفتاح يحجب الرابط ويحجب الزيارة المباشرة.

### معايير القبول
- صفر تعارض: لكل مسار في `ADMIN_ROUTES`، نتيجة `isRouteAllowed(path)` = ظهور الرابط في `useNavLinks`.
- اختبار تكامل يثبت ذلك لكل مفاتيح الصلاحيات.

---

## ترتيب التنفيذ المقترح
1. **المهمة 4** (تعارض المحاسب) — أصغر تغيير، يصلح خلل صامت.
2. **المهمة 2** (إعادة التسمية) — تمهيد ميكانيكي للمهمة 3.
3. **المهمة 3** (فصل الفواتير عن المصروفات) — الأثر الأكبر على UX.
4. **المهمة 1** (توسيع صلاحيات الإخفاء) — مستقلة، تُنفّذ بالتوازي.

## الملفات المتأثرة (ملخّص)
- `src/constants/sections.ts`, `routeRegistry.ts`, `navigation.ts`
- `src/types/invoices.ts`
- `src/hooks/page/admin/financial/useInvoicesPage.ts`, `useExpensesPage.ts`
- `src/hooks/page/beneficiary/financial/useInvoicesViewPage.ts`, `useExpensesViewPage.ts`
- `src/hooks/data/settings/useSectionsVisibility.ts`
- `src/hooks/application/useNavLinks.ts`
- `src/utils/auth/filterByVisibility.ts`
- `src/pages/dashboard/InvoicesPage.tsx`, `ExpensesPage.tsx`
- `src/pages/beneficiary/InvoicesViewPage.tsx`, `ExpensesViewPage.tsx`
- `src/components/invoices/InvoiceUploadDialog.tsx`
- `src/components/settings/permissions/SectionsTab.tsx`
- `src/constants/beneficiaryCopy.ts`
- اختبارات Vitest المتأثرة + `src/test/permissionsParity.test.ts` (جديد)
- ذاكرة: `mem://business-logic/finance/accounting-expenses-vs-tax-invoices`

## خارج النطاق
- إعادة هيكلة `InvoicesPage` إلى مكونات أصغر (P2).
- توحيد `useInvoicesPage` و`useInvoicesViewPage` في controller مشترك (P2).
- إصلاحات a11y للأزرار الأربعة (P3).
