# تحقق فعلي + خطة المراحل المتبقية

## ✅ P0 — مُصلَح بالكامل (تم التحقق)

| البند | الفحص الفعلي |
|------|--------------|
| #1 InvoicesPage.tsx `value="expense"` | لا وجود — `rg 'value="expense"' src/pages/` صفر نتائج ضمن تبويبات الفواتير (الناتج الوحيد في `ChartOfAccountsPage` هو SelectItem لنوع حساب، ليس فلتر فواتير) |
| #2 InvoicesViewPage.tsx | كذلك صفر |
| #3 PropertiesViewPage `/dashboard/reports` | صفر نتائج في `src/pages/beneficiary/` |
| #4 WaqifFinancialSection `/dashboard/reports` | صفر نتائج في `src/components/waqif/` |
| اختبار الانحدار | يفحص الآن `<TabsTrigger value="expense">` ويمنع الانحدار |

## 📊 ما يتبقى فعلياً (مؤكد بالأرقام)

- **#5 hooks/data مع uiNotify**: **25 ملف** (بعد إنجاز دفعة 2A: support/bylaws/annual-report).
- **#8 supabase خام في hooks/page**: **2 ملف** (`useVoucherActions.ts`، `useAggregatedAnnualReport.ts`).
- **#14 `window.confirm`**: موضعان في `src/lib/contracts/invoiceSync.ts` فقط (مركّز ومحدود).
- **#11 ResponsiveTabs**: مستخدم في 3 ملفات فقط مقابل 11 صفحة تستخدم Tabs خام.

## 📋 خطة الدفعات التالية (مرتّبة بالأثر/المخاطر)

### دفعة 2B — Toast migration للنطاق المالي الحسّاس (5 ملفات)
- `useAdvanceRequests.ts` (السلف)
- `useMaxAdvanceAmount.ts` (تحقق حد السلفة)
- `useDistribute.ts` (التوزيعات)
- `useExpenseBudgets.ts` (ميزانيات المصروفات)
- `useCloseFiscalYear.ts` (إقفال السنة)

**النهج**: إزالة `uiNotify` من hook، نقلها لاستدعاءات `mutate(vars, { onSuccess, onError })` في `hooks/page/admin/financial/*`. اختبار يدوي بعد كل ملف.

### دفعة 2C — ZATCA + Units mutations (5 ملفات)
- `useZatcaInvoiceActions.ts`، `useZatcaOnboarding.ts`
- `useUnits.ts`، `useUnitMutations.ts` (الأخير سيُنقل كاملاً إلى `hooks/page/admin/properties/`)
- `useWholePropertyRental.ts`

### دفعة 2D — الإعدادات/الإشعارات/التواصل (8 ملفات)
- `useWaqfInfoSave.ts`، `useLogoUpload.ts` (+ إصلاح setState في جسم hook → `useEffect`)
- `useAppSettingsWrite.ts`
- `useBulkMessaging.ts`
- `useNotificationActions.ts`، `useNotificationPreferences.ts`
- `useTenantPayments.ts`، `useCollectionAlerts.ts`، `useContractAllocations.ts`

### دفعة 2E — استبدال `window.confirm` بـ AlertDialog
- استخراج `ConfirmRegenerateDialog` و`ConfirmDeleteWithPendingDialog` كمكوّنين موحّدين باستخدام `ConfirmDeleteDialog` كأساس.
- تعديل `invoiceSync.ts` ليُرجع رسائل/بيانات فقط (دون `window.confirm`).
- تحديث الاستدعاءَين في `useContractForm.ts` و`useContractDelete.ts` لاستخدام state + dialog بدلاً من `confirm()` المتزامن.

### دفعة 3 — نقل Supabase الخام من hooks/page (ملفان)
- `useVoucherActions.ts` → استخراج `useVoucherMutations` في `hooks/data/financial/vouchers/`.
- `useAggregatedAnnualReport.ts` → استخراج `usePaidDistributionsByFiscalYear` في `hooks/data/financial/distribution/`.

### دفعة 4 (اختياري) — توحيد ResponsiveTabs
- تحويل 8 صفحات تستخدم Tabs خام (بدءاً بـ `InvoicesPage`، `ContractsPage`) إلى `ResponsiveTabs` مع ثوابت قيم محفوظة.

## ⏸ مؤجَّل (يحتاج قرارك)

- **#13** توحيد حوارات الحذف البسيطة (Bylaw + ChartOfAccounts + AnnualReport item) إلى `ConfirmDeleteDialog`.
- **#15** ثوابت رسائل PDF/Save (تم إنشاء `PDF_MESSAGES`/`SAVE_MESSAGES` سابقاً؛ يبقى التمشيط الكامل).
- **#16** ثوابت `ROUTES` (ليست أولوية بعد إصلاح الروابط الفعلية).
- **#17-19** Edge Functions Zod + `jwt_role`/`has_role`: حساس أمنياً، يحتاج migrations منفصلة واختبارات.

## 🎯 التوصية الآن

ابدأ بـ **دفعة 2B** (5 ملفات مالية) — أعلى أثر سلامة بيانات وأكثرها استخداماً، ثم 2E (إزالة `window.confirm`) لإغلاق نقطة UX واضحة. الدفعات 2C/2D ميكانيكية ويمكن تنفيذها على دفعتين متتاليتين.

أكّد المتابعة بـ **2B** أو رتّب الأولوية كما تريد.
