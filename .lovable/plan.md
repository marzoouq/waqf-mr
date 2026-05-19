# خطة: اختبارات انحدار لتغييرات الصلاحيات وفصل الفواتير/المصروفات

## الهدف
تثبيت السلوك الناتج عن آخر تعديلات على:
1. حماية أقسام `settings` و`users` من الإخفاء.
2. توسعة `ADMIN_SECTION_KEYS` (zatca, diagnostics, email_monitor, comparison).
3. إعادة تسمية `InvoiceSourceFilter` من `expense` → `purchase`.
4. الفصل التام بين صفحة الفواتير وصفحة المصروفات في لوحة الناظر والمستفيد.
5. توحيد منطق opt-out في فلترة الصلاحيات (`useNavLinks` / `usePermissionCheck`).

كل الاختبارات وحدوية/تكاملية خفيفة (Vitest + Testing Library + هوكات mocked)، بدون تشغيل تطبيق فعلي.

## الملفات الجديدة

### 1) `src/test/adminSectionsVisibility.test.ts`
- تأكيد أن `ADMIN_SECTION_KEYS` يحوي: `settings`, `zatca`, `diagnostics`, `email_monitor`, `comparison`, `users`.
- تأكيد أن `PROTECTED_ADMIN_SECTIONS = ['settings','users']` وأن `isProtectedAdminSection` يُرجع true لهما وfalse لغيرهما.
- تأكيد أن كل مفتاح في `ADMIN_SECTION_KEYS` له تسمية في `SECTION_LABELS` (حارس انحدار).

### 2) `src/test/sectionsVisibilityProtection.test.ts`
- اختبار تكاملي لـ `useSectionsVisibility` مع mock لـ `useAppSettings`:
  - حتى لو رجّعت قاعدة البيانات `{ settings: false, users: false }`، الناتج يجب أن يكون `true` لكليهما.
  - بقية المفاتيح تُحترم كما هي (`properties: false` يبقى `false`).

### 3) `src/test/invoiceSourceFilter.test.ts`
- اختبار نوع/قيم `InvoiceSourceFilter`:
  - فحص استاتيكي عبر type-assertions: `'purchase'` و`'rent'` و`'all'` مقبولة، `'expense'` غير مقبولة (يُختبر بفحص نصي على ملف `src/types/invoices.ts` أنه لا يحوي `'expense'` كنوع للحقل source).
  - فحص grep داخل الاختبار يضمن خلو `src/hooks/page/admin/financial/useInvoicesPage.ts` و`src/hooks/page/beneficiary/financial/useInvoicesViewPage.ts` و`src/pages/dashboard/InvoicesPage.tsx` و`src/pages/beneficiary/InvoicesViewPage.tsx` من السلسلة `'expense'` كقيمة فلتر (`source === 'expense'` أو `source: 'expense'`).

### 4) `src/test/invoicesExpensesDecoupling.test.ts`
- حارس انحدار يقرأ الملفات نصياً ويتأكد من:
  - `src/pages/dashboard/InvoicesPage.tsx` لا يستورد من `@/components/expenses/*` ولا `useExpensesPage`.
  - `src/pages/dashboard/ExpensesPage.tsx` لا يستورد من `@/components/invoices/*` ولا `useInvoicesPage`.
  - نفس الفحص لنسختي المستفيد (`InvoicesViewPage.tsx` ↔ `ExpensesViewPage.tsx`).
- يثبّت "الفصل" كعقد معماري لا يتراجع عنه أحد بالخطأ.

### 5) `src/test/navLinksFiltering.test.tsx`
- اختبار `useNavLinks` بـ mocking لـ `useAuth`, `useAppSettings`, `useSectionsVisibility`, `useRolePermissions`:
  - **ناظر**: قسم `expenses=false` → الرابط محذوف؛ `settings` و`users` يبقيان دائماً (حتى لو حاول الإعداد إخفاؤهما، تُجبرهما الحماية).
  - **محاسب**: صلاحية `accounts` غير محددة → الرابط ظاهر (opt-out)؛ `accounts:false` → الرابط محذوف.
  - **مستفيد**: قسم `invoices=false` → رابط `/beneficiary/invoices` محذوف لكن `/beneficiary/expenses` يبقى (دليل الفصل).

## الملفات المعدّلة
- لا تعديل على كود الإنتاج. فقط إضافة ملفات اختبار جديدة.

## التحقق
- تشغيل `bunx vitest run src/test/adminSectionsVisibility.test.ts src/test/sectionsVisibilityProtection.test.ts src/test/invoiceSourceFilter.test.ts src/test/invoicesExpensesDecoupling.test.ts src/test/navLinksFiltering.test.tsx`.
- جميع الاختبارات يجب أن تمرّ من المحاولة الأولى بناءً على الحالة الحالية للكود.

## خارج النطاق
- لا اختبارات E2E بالمتصفح.
- لا إعادة هيكلة لـ `InvoicesPage` (P2 سابقاً).
- لا تعديل على RLS أو Edge Functions.
