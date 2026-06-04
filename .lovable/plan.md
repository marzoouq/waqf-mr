# نتائج التحقق الفعلي من الادعاءات

تم فحص الكود مباشرة. هذه نتائج كل ادعاء:

## P0 — مؤكدة فعلياً (يجب إصلاحها)

| # | الادعاء | الحالة | الدليل |
|---|---------|--------|--------|
| 1 | `InvoicesPage.tsx` يستخدم `value="expense"` بينما النوع `purchase` | ✅ مؤكد | السطر 61: `<TabsTrigger value="expense">` والمقارنات على `'purchase'` (أسطر 71/87/96) |
| 2 | نفس الخطأ في `beneficiary/InvoicesViewPage.tsx` | ✅ مؤكد | السطر 72 |
| 3 | `PropertiesViewPage.tsx` يربط `/dashboard/reports` | ✅ مؤكد | السطر 87 (الجلسة السابقة أصلحت `حصتي` فقط على سطر 88، وتركت رابط التقارير) |
| 4 | `WaqifFinancialSection.tsx` يربط `/dashboard/reports` | ✅ مؤكد | السطر 108؛ والمسار محمي بـ `ADMIN_ROLES` فقط (لا يشمل الواقف) |
| 4b | (مكتشف إضافي) رابط «حصتي» في `PropertiesViewPage` يذهب إلى `/beneficiary/my-share` المحمي بـ `BENEFICIARY_ROLES` فقط، بينما الصفحة الأم متاحة للواقف عبر `ALL_NON_ACCOUNTANT` → الواقف يصل لرابط مكسور | ✅ مؤكد | beneficiaryRoutes.tsx:32 vs :29 |

ملاحظة على اختبار الانحدار: `src/test/invoiceSourceFilter.test.ts` يفحص `useInvoicesPage.ts` فقط ولا يفحص JSX داخل `InvoicesPage.tsx`، لهذا فات عليه الخطأ. سنوسّعه.

## P1/P2/P3 — صحيحة جزئياً (مؤجَّلة)

- **#5 toast في hooks/data**: مؤكد — 25 ملف ما زال يستورد `uiNotify`. الدفعة 2A أُنجزت (support/bylaws/annual-report). الباقي ضمن دفعات 2B–2D.
- **#8 supabase خام في hooks/page**: مؤكد في `useVoucherActions.ts` و`useAggregatedAnnualReport.ts`.
- **#11, #13, #14, #15, #16**: ادعاءات معمارية صحيحة لكنها تحسينات، لا أخطاء وظيفية.

---

# خطة التنفيذ

## المرحلة الحالية — إصلاح P0 فقط (4 ملفات + اختبار)

### 1. `src/pages/dashboard/InvoicesPage.tsx`
- السطر 61: `value="expense"` → `value="purchase"`

### 2. `src/pages/beneficiary/InvoicesViewPage.tsx`
- السطر 72: `value="expense"` → `value="purchase"`

### 3. `src/pages/beneficiary/PropertiesViewPage.tsx`
- السطر 87: `/dashboard/reports` → `/beneficiary/financial-reports`
- السطر 88: `/beneficiary/my-share` → إخفاء الرابط للواقف (شرط على الدور) أو توجيهه للتقارير المالية. الخيار المقترح: عرض «حصتي» للمستفيد فقط عبر `useRole()`.

### 4. `src/components/waqif/WaqifFinancialSection.tsx`
- السطر 108: `/dashboard/reports` → `/beneficiary/financial-reports` (متاح للواقف عبر `ALL_NON_ACCOUNTANT`)
- تحديث التعليق في الرأس (السطر 5).

### 5. توسيع اختبار الانحدار
- في `src/test/invoiceSourceFilter.test.ts`: إضافة فحص أن `InvoicesPage.tsx` و`InvoicesViewPage.tsx` لا يحويان `value="expense"` داخل `TabsTrigger`.

## المرحلة التالية (بعد موافقتك) — استكمال التنظيف المعماري

دفعات Toast migration المتبقية (2B–2D)، نقل supabase الخام من hooks/page، توحيد `ResponsiveTabs`، استبدال `window.confirm` بـ `AlertDialog`. لن تُنفَّذ الآن.

---

# التفاصيل التقنية

- اختيار `/beneficiary/financial-reports` كبديل لـ `/dashboard/reports` آمن لأنه محمي بـ `ALL_NON_ACCOUNTANT = ['admin','beneficiary','waqif']` — يغطي كلا الدورين.
- الحل لرابط «حصتي» داخل `PropertiesViewPage`: استيراد `useAuth().role` وعرض الرابط فقط عندما `role !== 'waqif'` (أبسط من تعديل صلاحيات المسار).
- لا تغييرات DB، لا migrations، لا Edge Functions.
