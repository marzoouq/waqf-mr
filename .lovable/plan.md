

# خطة: إضافة aria-label الشاملة + PrintHeader dir="rtl"

## نتائج التحقق الجنائي الصادق

### ✅ كل "الجرائم" في التقرير المقدّم مُصلحة بالفعل:
| البند | الحالة | الدليل |
|-------|--------|--------|
| overflow-x-auto في AccountsCollectionTable | ✅ مُصلح | سطر 62: `<div className="overflow-x-auto">` |
| overflow-x-auto في AccountsSavedTable | ✅ مُصلح | سطر 42: `<div className="overflow-x-auto">` |
| overflow-x-auto في AccountsExpensesTable | ✅ مُصلح | سطر 25: `<div className="overflow-x-auto">` + `min-w-[350px]` |
| overflow-x-auto في AccountsIncomeTable | ✅ مُصلح | سطر 25: `<div className="overflow-x-auto">` + `min-w-[350px]` |
| Skeleton في AccountsSavedTable | ✅ مُصلح | سطر 31-34: `Skeleton` components |
| isActive للمسارات الفرعية | ✅ مُصلح | سطر 67-69 |
| TablePagination aria-labels | ✅ مُصلح | سطر 30, 51, 64 |
| MessagesPage send aria-label + loader | ✅ مُصلح | سطر 160 |
| MobileCardView isLoading + aria-labels | ✅ مُصلح | سطر 39-58, 80, 85 |

> التقرير المقدّم مبني على commit قديم (`a5d57c2`). الكود الحالي يحتوي على كل الإصلاحات.

### ❌ ما يحتاج إصلاح فعلاً:

## 1. `PrintHeader.tsx` — إضافة `dir="rtl"` (بدون تاريخ هجري حسب القرار)

## 2. أزرار أيقونية بدون `aria-label` — 15 ملف، ~80 زر

| الملف | الأزرار المفقودة |
|-------|-----------------|
| `NotificationBell.tsx` | الإشعارات |
| `GlobalSearch.tsx` | مسح البحث |
| `MessagesPage.tsx` | زر الرجوع |
| `AccountsContractsTable.tsx` | تعديل، حذف |
| `PropertyUnitsDialog.tsx` | +، -، تعديل، حذف |
| `BiometricSettings.tsx` | حذف |
| `CollectionReport.tsx` | تعديل الدفعات |
| `InvoicesPage.tsx` | عرض، تعديل، حذف |
| `IncomePage.tsx` | تعديل، حذف (×2 جوال+جدول) |
| `ContractsPage.tsx` | تجديد، تعديل، حذف، +، - |
| `ExpensesPage.tsx` | تعديل، حذف |
| `BeneficiariesPage.tsx` | تعديل، حذف |
| `PropertiesPage.tsx` | تعديل، حذف |
| `SettingsPage.tsx` | تشغيل النغمة |
| `BeneficiarySettingsPage.tsx` | إظهار/إخفاء كلمة المرور |

## الملفات المتأثرة: 16 ملف

| الملف | التغيير |
|-------|---------|
| `PrintHeader.tsx` | إضافة `dir="rtl"` |
| 15 ملف أعلاه | إضافة `aria-label` لكل زر أيقوني |

