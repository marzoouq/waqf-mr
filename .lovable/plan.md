## نظرة عامة

ثلاث مهام منفصلة:
- **A.** تحقق من أن التقارير تستخدم نموذج 'purchase' الجديد لمصدر الفواتير ولا تختلط بمصدر المصروفات التشغيلية.
- **B.** توحيد أزرار تصدير PDF لكل تقرير من اللوحات المتاحة مع نفس فلاتر السنة المالية.
- **C.** سد ثغرة حماية `PROTECTED_ADMIN_SECTIONS` على مستوى الكتابة (ليس فقط القراءة).

---

## A) تحقق التقارير من مصدر البيانات الصحيح

### ما تم التأكد منه (لا تغيير مطلوب)
- `InvoiceSourceFilter = 'rent' | 'purchase' | 'all'` (لا يوجد `'expense'` متبقٍ).
- `useReportsData`, `useAnnualReportPage`, `useAccountsPage` تستهلك جميعها `useRawFinancialData` → جدول `expenses` و `income` مباشرة، **بدون** المرور على فلتر الفواتير. أي rename لا يؤثر على الأرقام.
- `'expense'` المتبقي يعود إلى نطاقات مختلفة شرعياً: `chart_of_accounts.category_type`, `invoice_type = 'expense'` في فاتورة الشراء، ونوع نتيجة البحث العام — هذه ليست `InvoiceSourceFilter`.

### يضاف اختبار انحدار جديد
`src/test/reportsPurchaseSourceContract.test.ts`:
1. يتحقق أن `useReportsData`/`useAnnualReportPage`/`useAccountsPage` لا تستورد `InvoiceSourceFilter` ولا تستخدم حرفياً `'expense'` كقيمة `source`.
2. يتحقق بـ regex على ملفات `src/utils/pdf/reports/*` و `src/utils/pdf/entities/*` أن قيم `source` المستخدمة ضمن مجموعة `{rent, purchase, all}` فقط.
3. اختبار تكاملي خفيف: `totalExpenses` في `useReportsData` = مجموع `expenses[].amount` بعد استبعاد VAT — موازناً مع snapshot ثابت.

---

## B) أزرار تصدير PDF موحّدة لكل تقرير

### الوضع الحالي
| الصفحة | PDF موجود؟ |
|---|---|
| ReportsPage (ناظر) | 3 أزرار (الإفصاح، الفحص الجنائي، تقرير عام) |
| AccountsPage (ناظر) | ExportMenu واحد (الحساب الختامي) |
| AnnualReportPage (ناظر) | handleExportPdf + handleExportCsv |
| AnnualReportViewPage (مستفيد) | handleExportPdf + handleExportCsv |
| MySharePage (مستفيد) | 3 PDFs (حصة + توزيع + شامل) |

### الناقص
- **ReportsPage** لا يحتوي زراً مستقلاً لتصدير **تقرير توزيع الحصص** رغم وجود `generateDistributionsPDF` و `BeneficiaryDistributionTable`.
- **AccountsPage** يحتوي ExportMenu واحد فقط؛ لا يصدّر جدول التوزيع ولا الإفصاح بشكل مستقل من نفس الشاشة.
- جميع تصديرات الناظر تعتمد على `fiscalYear` من `FiscalYearContext` (مضمَّن بالفعل) — يبقى ضمان تمرير `fiscalYearLabel` صراحة للملفات.

### التغييرات
1. **`src/hooks/page/admin/reports/useReportsExport.ts`** — إضافة `handleExportDistribution`:
   - يستدعي `generateDistributionsPDF` بـ `distributionData`, `beneficiariesShare`, `fiscalYearLabel`, `pdfWaqfInfo`.
2. **`src/pages/dashboard/ReportsPage.tsx`** — إضافة زر "تقرير توزيع الحصص PDF" في `actions` بجانب الأزرار الموجودة، مع أيقونة `Wallet`/`Users`.
3. **`src/hooks/page/admin/financial/useAccountsPage.ts`** — إضافة `handleExportDistributionPdf` و `handleExportDisclosurePdf` تعتمدان على نفس `pdfWaqfInfo` + `selectedFY.label`.
4. **`src/pages/dashboard/AccountsPage.tsx`** — استبدال `ExportMenu` المفرد بقائمة موسّعة (3 بنود: حساب ختامي، إفصاح، توزيع) عبر `ExportMenu` مع `items` متعددة، أو إضافة أزرار ثانوية بنفس نمط ReportsPage.
5. ضمان كل handler يقرأ `fiscalYearLabel` و الفلاتر النشطة من نفس مصدر العرض (يستخدم `useReportsData`/`useAccountsPage` نفسها — لا تكرار).

### اختبارات
- توسيع `pageHookBindingContract.test.ts`:
  - `ReportsPage.tsx` يجب أن يستدعي `handleExportDistribution` ضمن actions.
  - `AccountsPage.tsx` يجب أن يستدعي `handleExportDisclosurePdf` و `handleExportDistributionPdf`.
- `src/test/reportsPdfHandlers.test.ts` جديد: يتأكد أن كل handler يمرر `fiscalYearLabel` غير فارغ عند توفر `fiscalYear` نشطة.

---

## C) إحكام `PROTECTED_ADMIN_SECTIONS` على طبقة الكتابة

### الثغرة المكتشفة
`src/hooks/page/admin/settings/usePermissionsControlPanel.ts`:
- `toggleAdminSection(key)` يقبل أي مفتاح بدون فحص `isProtectedAdminSection`.
- `handleSave` يكتب `adminSections` للـ DB كما هو — لو غُيِّر `settings:false` يدوياً أو عبر تعديل سابق، يُحفَظ في `app_settings.sections_visibility`. الـ data hook يصلحه عند القراءة، لكن DB يبقى ملوثاً ويظهر للاختبارات/التشخيص قيمة خاطئة.

`SectionsTab.tsx` آمن (يستخدم `isProtectedAdminSection`)، لكن لوحة الصلاحيات الموحَّدة ليست كذلك.

### التغييرات
1. **`usePermissionsControlPanel.ts`**:
   - `toggleAdminSection`: تجاهل المفاتيح المحمية (`if (isProtectedAdminSection(key)) return;`).
   - `handleSave`: قبل الكتابة، تطبيع `adminSections` بحيث كل مفتاح في `PROTECTED_ADMIN_SECTIONS = true`.
   - عند `handleReset`: نفس التطبيع.
2. **مكوّن العرض المرتبط** (لو يعرض toggle لكل قسم): تمرير `disabled` للمفاتيح المحمية مثل `SectionsTab`.
3. لا تغيير في `useSectionsVisibility` (الحماية على القراءة تبقى كحاجز نهائي).

### اختبارات
1. **`src/test/protectedSectionsWriteGuard.test.ts`** جديد:
   - يحاكي `toggleAdminSection('settings')` و يتأكد أن state لم يتغير.
   - يستدعي `handleSave` بعد محاولة `setAdminSections({ ..., settings: false })` ويتأكد أن الـ payload المُمرَّر لـ `updateJsonSetting('sections_visibility', ...)` يحتوي `settings: true, users: true`.
2. توسيع `permissionsResilience.test.tsx`: حالة "DB ملوّث بـ `settings:false`" — يجب أن يظل `/dashboard/settings` ظاهراً (نختبر تكاملاً عبر `useSectionsVisibility` الحقيقي بدلاً من mock).
3. باقي الملاحة لا تتأثر: نتأكد أن إخفاء `expenses` أو `invoices` يظل يعمل كالمعتاد (موجود بالفعل في الاختبارات السابقة).

---

## الملفات

**تعديل**:
- `src/hooks/page/admin/reports/useReportsExport.ts`
- `src/pages/dashboard/ReportsPage.tsx`
- `src/hooks/page/admin/financial/useAccountsPage.ts`
- `src/pages/dashboard/AccountsPage.tsx`
- `src/hooks/page/admin/settings/usePermissionsControlPanel.ts`
- المكوّن المعروض للوحة الصلاحيات (لو يحتوي toggles مباشرة)
- `src/test/pageHookBindingContract.test.ts`

**إنشاء**:
- `src/test/reportsPurchaseSourceContract.test.ts`
- `src/test/reportsPdfHandlers.test.ts`
- `src/test/protectedSectionsWriteGuard.test.ts`

**بلا تغيير**:
- `useSectionsVisibility`, `SectionsTab`, `routeRegistry`, `navigation`, `InvoiceSourceFilter` (سليمة).

## التحقق
```bash
bunx vitest run src/test/reportsPurchaseSourceContract src/test/reportsPdfHandlers \
                src/test/protectedSectionsWriteGuard src/test/pageHookBindingContract \
                src/test/permissionsResilience src/test/sectionsVisibilityProtection
```
ثم QA يدوي: فتح ReportsPage و AccountsPage، التأكد أن كل زر PDF يولّد ملفاً صحيحاً يحمل عنوان السنة المالية.
