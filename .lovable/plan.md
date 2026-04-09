

# خطة تنفيذ التحسينات المعمارية — الدورة الرابعة

## نظرة عامة

إصلاح 14 اعتماداً معكوساً عبر نقل الأنواع المشتركة إلى `src/types/`. لا تغييرات وظيفية.

---

## الدفعة الأولى — إصلاح الاعتمادات المعكوسة الهيكلية (~13 ملف)

### الخطوة 1: نقل `MenuLabels` إلى `src/types/navigation.ts`

إنشاء `src/types/navigation.ts` يحتوي `MenuLabels` interface + `defaultMenuLabels`. تحديث:
- `constants/navigation.ts` ← استيراد من `@/types/navigation`
- `hooks/page/shared/useNavLinks.ts` ← استيراد من `@/types/navigation`
- `components/settings/MenuCustomizationTab.tsx` ← استيراد من `@/types/navigation`
- `components/layout/menuLabels.ts` ← تحويل إلى re-export (توافق عكسي)

### الخطوة 2: نقل `Invoice` إلى `src/types/invoices.ts`

إنشاء `src/types/invoices.ts`. نقل `Invoice` interface من `useInvoices.ts` و `PaymentInvoice` interface من `usePaymentInvoices.ts`. تحديث:
- `hooks/data/invoices/useInvoices.ts` ← re-export `Invoice` من `@/types/invoices`
- `hooks/data/invoices/usePaymentInvoices.ts` ← re-export `PaymentInvoice` من `@/types/invoices`
- `utils/pdf/invoices/invoice.ts` ← استيراد من `@/types/invoices`
- `utils/pdf/invoices/invoices.ts` ← استيراد من `@/types/invoices`

**ملاحظة**: 28 ملف آخر يستورد هذه الأنواع من hooks — لن تتأثر لأن hooks ستُعيد تصديرها.

### الخطوة 3: نقل `ExportableTable` إلى `src/types/export.ts`

إنشاء `src/types/export.ts`. تحديث:
- `hooks/page/shared/useDataExport.ts` ← re-export
- `lib/services/dataFetcher.ts` ← استيراد من `@/types/export`

### الخطوة 4: تحديث `appSettings.ts` + حذف `layout/constants.ts`

- `utils/diagnostics/checks/appSettings.ts` ← استيراد من `@/constants/navigation` مباشرة
- `components/layout/index.ts` ← تغيير re-export الثوابت من `'./constants'` إلى `'@/constants/navigation'` مباشرة
- حذف `components/layout/constants.ts` (أصبح وسيطاً بلا قيمة)

---

## الدفعة الثانية — نقل أنواع النماذج من Components إلى Types (~15 ملف)

### الخطوة 5: `ContractFormData` → `src/types/forms/contract.ts`

نقل من `components/contracts/contractForm.types.ts`. تحديث:
- `hooks/page/admin/contracts/useContractForm.ts`
- `hooks/page/admin/contracts/useContractFormDialog.ts`
- `components/contracts/contractForm.types.ts` ← re-export
- 3 مكونات داخلية تستورد من `../contractForm.types` (تبقى كما هي عبر re-export)

### الخطوة 6: `BeneficiaryFormData` → `src/types/forms/beneficiary.ts`

نقل من `components/beneficiaries/`. تحديث:
- `hooks/page/admin/management/useBeneficiariesPage.ts`
- barrel المكونات ← re-export

### الخطوة 7: `StatItem` + `KpiItem` → `src/types/dashboard.ts`

نقل من `components/dashboard/`. تحديث:
- `hooks/page/admin/dashboard/useAdminDashboardStats.ts`
- barrel المكونات ← re-export

### الخطوة 8: `AllowanceChargeItem` + `InvoicePreviewData` → `src/types/invoices.ts` (ملحق)

إضافة إلى `src/types/invoices.ts` الموجود. تحديث:
- `hooks/page/admin/financial/useCreateInvoiceForm.ts`
- `hooks/page/admin/financial/usePaymentInvoicesTab.ts`
- `hooks/page/admin/financial/useInvoicesPage.ts`
- barrel المكونات ← re-export

### الخطوة 9: `UnitFormData` + `WholeRentalForm` → `src/types/forms/property.ts`

نقل من `components/properties/units/`. تحديث:
- `hooks/data/properties/useUnitMutations.ts`
- `hooks/data/contracts/useWholePropertyRental.ts`
- المكونات الأصلية ← re-export

---

## الدفعة الثالثة — اختيارية

### الخطوة 10: استخراج `useLoginForm` hook
تجميع 10 `useState` من `LoginForm.tsx` في hook مخصص بـ `src/hooks/auth/useLoginForm.ts`.

### الخطوة 11: تبسيط `AccountsDistributionTable` props
تجميع 15+ prop في كائن config واحد.

---

## التفاصيل التقنية

**نمط النقل**: لكل نوع يُنقل:
1. إنشاء الملف الجديد في `src/types/`
2. تحويل الملف الأصلي إلى re-export (`export { X } from '@/types/...'`)
3. تحديث hooks/utils فقط ليستوردوا من `@/types/` مباشرة
4. المكونات التي تستورد من الملف الأصلي لا تتأثر (re-export يحمي التوافق)

**التحقق**: `npx tsc --noEmit` بعد كل دفعة.

## ملخص التأثير

| الدفعة | ملفات جديدة | ملفات معدّلة |
|--------|------------|-------------|
| 1: اعتمادات هيكلية | 3 (`types/navigation.ts`, `types/invoices.ts`, `types/export.ts`) | ~10 |
| 2: أنواع النماذج | 3 (`types/forms/contract.ts`, `forms/beneficiary.ts`, `forms/property.ts`, `types/dashboard.ts`) | ~12 |
| 3: اختيارية | 1 | 2 |
| **المجموع** | **~7** | **~24** |

