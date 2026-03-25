

# إضافة `htmlFor` للعناصر `<Label>` المفقودة

## المشكلة
142 عنصر `<Label>` بدون سمة `htmlFor` في 13 ملف — النقر عليها لا يُركّز الحقل المقابل.

## التصنيف

### حقول Input — يمكن ربطها مباشرة (إضافة `htmlFor` + `id` إن لزم)

| الملف | السطر | Label | الربط المطلوب |
|-------|-------|-------|---------------|
| `ExpenseFormDialog.tsx` | 66 | المبلغ | `htmlFor="expense-form-dialog-field-1"` |
| `ExpenseFormDialog.tsx` | 83 | التاريخ | `htmlFor="expense-form-dialog-field-2"` |
| `ExpenseFormDialog.tsx` | 92 | الوصف | `htmlFor="expense-form-dialog-field-3"` |
| `InvoicesPage.tsx` | 120 | رقم الفاتورة | إضافة `id="invoice-number"` + `htmlFor` |
| `InvoicesPage.tsx` | 121 | المبلغ | إضافة `id="invoice-amount"` + `htmlFor` |
| `InvoicesPage.tsx` | 124 | التاريخ | إضافة `id="invoice-date"` + `htmlFor` |
| `InvoicesPage.tsx` | 138 | وصف | إضافة `id="invoice-description"` + `htmlFor` |
| `ChartOfAccountsPage.tsx` | 274 | الكود | إضافة `id="chart-code"` + `htmlFor` |
| `ChartOfAccountsPage.tsx` | 283 | الترتيب | إضافة `id="chart-sort"` + `htmlFor` |
| `ChartOfAccountsPage.tsx` | 292 | اسم الحساب | إضافة `id="chart-name"` + `htmlFor` |
| `ContractFormDialog.tsx` | 427 | ملاحظات | `htmlFor="contract-form-dialog-field-4"` |
| `BeneficiaryFormDialog.tsx` | 94 | ملاحظات | إضافة `id="beneficiary-notes"` + `htmlFor` |

### حقول NativeSelect — يمكن ربطها (NativeSelect يدعم `id`)

| الملف | السطر | Label | الربط المطلوب |
|-------|-------|-------|---------------|
| `IncomePage.tsx` | 220 | العقار | إضافة `id` على NativeSelect + `htmlFor` |
| `InvoicesPage.tsx` | 126-127 | نوع الفاتورة | إضافة `id` + `htmlFor` |
| `InvoicesPage.tsx` | 131-132 | العقار | إضافة `id` + `htmlFor` |
| `InvoicesPage.tsx` | 135-136 | العقد | إضافة `id` + `htmlFor` |

### حقول Select (Radix) — لا يدعم `htmlFor` مباشرة

هذه لا يمكن ربطها بسهولة عبر `htmlFor` لأن `Select` من Radix لا يكشف `id` على عنصر input أصلي. سنتركها كما هي (مذكورة في الذاكرة السابقة):
- `BulkNotificationsTab.tsx` سطر 106
- `ZatcaSettingsTab.tsx` سطر 275
- `ChartOfAccountsPage.tsx` سطر 301، 318
- `ReportItemFormDialog.tsx` سطر 78

### حالات خاصة — لا تحتاج `htmlFor`

- `ContractFormDialog.tsx` سطر 153 (RadioGroup — Labels تعمل كأغلفة)
- `ContractFormDialog.tsx` سطور 160-171, 253, 260, 264 (Labels تلف RadioGroupItem — تعمل بالفعل)
- `WaqfInfoBar.tsx` سطر 208 (Label لمنطقة رفع ملف — لا حقل مباشر)
- `BannerSettingsTab.tsx` سطور 63, 84, 117 (Labels لأزرار ألوان/مواقع/معاينة)
- `InvoicesPage.tsx` سطر 92 (Label لمنطقة رفع ملف)

## خطة التنفيذ

### الملفات المطلوب تعديلها: 6 ملفات

1. **`ExpenseFormDialog.tsx`** — إضافة `htmlFor` لـ 3 Labels (المبلغ، التاريخ، الوصف)
2. **`InvoicesPage.tsx`** — إضافة `id` + `htmlFor` لـ 7 حقول (Input + NativeSelect)
3. **`ChartOfAccountsPage.tsx`** — إضافة `id` + `htmlFor` لـ 3 حقول Input
4. **`ContractFormDialog.tsx`** — إضافة `htmlFor` لـ Label الملاحظات
5. **`BeneficiaryFormDialog.tsx`** — إضافة `id` + `htmlFor` لحقل الملاحظات
6. **`IncomePage.tsx`** — إضافة `id` على NativeSelect + `htmlFor` على Label

## ملاحظة
حقول Radix `Select` (5 حالات) تبقى بدون ربط — تحتاج تغييراً في مكوّن Select نفسه وهو خارج نطاق هذه المهمة.

