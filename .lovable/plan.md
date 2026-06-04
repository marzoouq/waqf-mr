# ربط CRUD العقود بسجلات الدخل والفواتير

> **مُتحقّق منه:** التقرير الميداني أكّد أن جميع الفجوات السبعة حقيقية ولا شيء منها مُنفَّذ. الدوال جاهزة في DB لكن لا تُستدعى من الواجهة، ولا يوجد trigger يعوّضها.

## الفجوة الأساسية
- `generate_contract_invoices(uuid)` و `pay_invoice_and_record_collection(uuid)` موجودتان في DB ومحميتان بـ `has_role(admin|accountant)`.
- `useGenerateContractInvoices` معرَّف في `usePaymentInvoices.ts:37` لكنه مستخدم في الاختبارات فقط.
- `useContractForm.ts` ينفّذ `syncAllocations` بعد الحفظ فقط — **لا** توليد فواتير، **لا** حماية حذف.
- نتيجة عملية: إنشاء/تعديل/حذف عقد من لوحة الناظر لا يولّد ولا يُحدّث ولا ينظّف أي سجلات مالية.

## القرارات
- **التوليد:** تلقائي فور حفظ العقد + زر «إعادة توليد المعلقة» في إجراءات العقد.
- **التعديل:** المدفوع محفوظ دائماً. المعلق يُحذف ويُعاد توليده. تنبيه قبل الحفظ عند وجود مدفوع.
- **الحذف:** ممنوع إن وُجدت فواتير مدفوعة. مسموح مع cascade لفواتير معلقة فقط.
- **الإنهاء (terminate):** خارج النطاق — مهمة منفصلة لاحقة.

## التغييرات

### 1) `src/hooks/data/invoices/usePaymentInvoices.ts`
- إضافة `useDeleteContractPendingInvoices()` — يحذف `payment_invoices` حيث `contract_id=X AND status='pending'` (بدون توست — قاعدة `no-toast-in-data-hooks`).
- إضافة `useContractInvoiceSummary(contractId)` — يُرجع `{ paidCount, pendingCount }` للاستخدام في حوارات التأكيد.

### 2) `src/lib/contracts/invoiceSync.ts` (جديد، ≤80 سطر)
- `notifyInvoicesGenerated(count)`, `notifyInvoicesRegenerated(count)`, `notifyDeleteBlocked(paidCount)` — توست عربية موحّدة عبر `uiNotify`.
- منطق الـ side-effect يبقى في `lib/` (ليس `utils/` ولا `hooks/data/`).

### 3) `src/hooks/page/admin/contracts/useContractForm.ts` (تعديل)
بعد `syncAllocations` في كلا المسارين (create/update):
- **Create:** استدعاء `generateInvoices.mutateAsync(newContractId)` ثم `notifyInvoicesGenerated`.
- **Update:** قراءة `useContractInvoiceSummary` للعقد. إن `paidCount > 0` → `confirm` عربي «لديك N فواتير مدفوعة محفوظة؛ سيتم إعادة توليد المعلقة فقط». ثم `deletePendingInvoices` → `generateInvoices` → `notifyInvoicesRegenerated`.
- Invalidate موحّد: `['payment_invoices']`, `['income']`, `['contracts']`, `['contract-allocations']`.

### 4) `src/hooks/page/admin/contracts/useContractDelete.ts` (جديد، ≤100 سطر)
- يقرأ `useContractInvoiceSummary` قبل أي عملية.
- `paidCount > 0` → blocking dialog «لا يمكن حذف عقد له فواتير مدفوعة. استخدم الإنهاء.» (يعود `false`).
- `pendingCount > 0` فقط → confirm «سيتم حذف N فاتورة معلقة مع العقد. متابعة؟» → `deletePendingInvoices` → `deleteContract`.
- لا فواتير → حذف مباشر مع confirm قياسي.

### 5) ربط الواجهة
- `src/components/contracts/ContractsTableActions.tsx` (أو ما يكافئها — البحث في build mode):
  - استبدال استدعاء `useDeleteContract` المباشر بـ `useContractDelete`.
  - إضافة عنصر قائمة «إعادة توليد الفواتير المعلقة» → `deletePendingInvoices` + `generateInvoices` + `notifyInvoicesRegenerated`.

### 6) ذاكرة المشروع
- إنشاء `mem://business-logic/contracts/invoice-sync-on-mutation` يوثّق القاعدة:
  > «إنشاء/تعديل عقد يُولّد فواتيره تلقائياً. المدفوعة لا تُمسّ أبداً. المعلقة تُحذف وتُعاد عند التعديل. سجلات `income` تُكتب حصرياً عبر `pay_invoice_and_record_collection` (لا إدراج يدوي).»
- تحديث `mem://index.md` (إضافة سطر مرجع، الاحتفاظ بالباقي حرفياً).

## خارج النطاق
- لا تعديل على migrations/RLS/RPC (كله جاهز).
- لا إجراء «إنهاء عقد».
- لا إنشاء/تعديل `income` يدوياً — يبقى المسار الوحيد عبر `pay_invoice_and_record_collection` (Core memory: Unified Collection Sync).
- لا تعديل ملفات محمية (`client.ts`, `types.ts`, `config.toml`, `AuthContext`, `ProtectedRoute`).

## خطة التحقق
1. `bunx tsc --noEmit` نظيف.
2. `bun run lint -- --max-warnings 0`.
3. اختبار وحدة `useContractDelete.test.ts`: ثلاث حالات (بدون فواتير / معلقة فقط / مدفوعة → محظور).
4. تحقق يدوي على `/dashboard/contracts`:
   - إنشاء عقد → ظهور فواتيره في `/dashboard/invoices`.
   - تعديل سعر عقد بمعلقة فقط → الفواتير القديمة تختفي والجديدة تظهر بالسعر الجديد.
   - تعديل عقد بفواتير مدفوعة → تنبيه قبل الحفظ، المدفوعة كما هي.
   - حذف عقد بمدفوعة → blocking dialog.
   - حذف عقد بمعلقة فقط → يُحذف هو وفواتيره.
   - دفع فاتورة من `/dashboard/invoices` → سجل `income` يظهر في صفحة الدخل.
5. SQL تحقق (read-only): `SELECT count(*) FROM income i LEFT JOIN payment_invoices p ON i.invoice_id=p.id WHERE p.id IS NULL;` يجب أن يساوي 0 (لا دخل يتيم).
