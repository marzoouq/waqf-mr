# تدقيق التكرار والتعارض في تدفق العقود ↔ الفواتير

## النتائج (تم التحقق بالكود)

### 1. تكرار توست فعلي عند الإنشاء متعدد الوحدات
في `useContractForm.handleFormSubmit` (multi-mode، N وحدات):
- لكل وحدة: `createContract` → factory CRUD يطلق **«تم إضافة العقد بنجاح»** (يُلَمّ التكرار بواسطة dedup 2s ✓)
- لكل وحدة: `generateInvoices.mutateAsync` → data hook يطلق **«تم توليد X فاتورة»** (X يختلف بين العقود غالباً → dedup لا يلتقطها → **N توستات**)
- في النهاية: **«تم إنشاء N عقد للمستأجر …»**

النتيجة: حتى **2N+1 توست** لعملية واحدة منطقياً. ضوضاء + رسائل متضاربة (factory يقول "تم إضافة العقد" بينما الإجمالي يقول "تم إنشاء N عقد").

### 2. مخالفة قاعدة `mem://conventions/no-toast-in-data-hooks`
`src/hooks/data/invoices/usePaymentInvoices.ts` فيه `uiNotify.*` في 4 mutations:
`useGenerateContractInvoices`, `useGenerateAllInvoices`, `useMarkInvoicePaid`, `useMarkInvoiceUnpaid`.
نفس المخالفة في `src/hooks/data/invoices/useInvoices.ts` (delete + PDF).
القاعدة: `hooks/data/` نقي بدون toast — الإشعارات في `hooks/page/`.

### 3. كود ميت تم إنشاؤه في الجولة السابقة ولم يُربط
- `useContractInvoiceSummary` (في `usePaymentInvoices.ts`) — **لا مستورد واحد**. `useContractForm` و`useContractDelete` يكرران نفس الاستعلام يدوياً بدلاً من استخدامه.
- `notifyInvoicesRegenerated` (في `invoiceSync.ts`) — **لا مستورد واحد**. مسار التعديل لا يطلق رسالة "إعادة توليد" صريحة، بل يعتمد على توست data-hook العام «تم توليد X فاتورة» الذي لا يميّز بين التوليد الأول وإعادة التوليد.

### 4. ازدواجية استعلام الفواتير قبل التعديل/الحذف
- `useContractForm.handleFormSubmit` (سطر 104-109): `supabase.from('payment_invoices').select('status').eq('contract_id', …)`
- `useContractDelete.deleteWithGuard` (سطر 33-36): نفس الاستعلام حرفياً.
وكلاهما يكرر منطق `useContractInvoiceSummary` الميت.

### 5. تعارض مع نمط الواجهة
`confirmRegenerateWithPaid` و`confirmDeleteWithPending` يستخدمان `window.confirm` بينما باقي المشروع يستخدم AlertDialog. خارج النطاق هنا (يتطلب UI work)، يُسجَّل كملاحظة فقط.

### 6. ليس تكراراً (تم التحقق ونفيه)
- `notifyPendingInvoicesDeleted` يُستدعى فقط في `useContractDelete` ولا تعارض مع factory delete (الذي يطلق «تم حذف العقد بنجاح»). الرسالتان مختلفتان وكلتاهما مفيدتان.
- `dedupToast` بـ 2000ms في `lib/notify.ts` يحمي من تكرار نفس الـ string فقط — لا يحمي من رسائل مختلفة المعنى المتكررة.

## التغييرات المقترحة

### A. نقل توستات data hooks إلى طبقة الصفحة
**`src/hooks/data/invoices/usePaymentInvoices.ts`** — إزالة `uiNotify.*` من:
- `useGenerateContractInvoices` (onSuccess + onError)
- `useGenerateAllInvoices`
- `useMarkInvoicePaid`
- `useMarkInvoiceUnpaid`

تبقى `qc.invalidateQueries` فقط. حذف استيراد `uiNotify`.

**`src/hooks/data/invoices/useInvoices.ts`** — نفس المعالجة (delete + PDF) ونقل التوست إلى الـ page hooks المستدعية.

### B. تنسيق توستات تدفق العقد في `useContractForm`
- **EDIT**: استبدال الاعتماد على توست data-hook بـ:
  ```
  await updateContract  // factory: "تم تحديث العقد بنجاح" — واحدة فقط
  await deletePendingInvoices
  const count = await generateInvoices
  notifyInvoicesRegenerated(count)  // "تم إعادة توليد N فاتورة معلقة وفق القيم الجديدة"
  ```
  بدلاً من «تم توليد X فاتورة» الغامض.

- **CREATE single**: إبقاء توست factory «تم إضافة العقد» وإضافة `notifyInvoicesGenerated(count)` صريحة (دالة جديدة في `invoiceSync.ts`) بدلاً من توست data-hook.

- **CREATE multi**: 
  - كتم رسائل factory create لكل عقد عبر تمرير `notifications: { onCreateSuccess: noop }` أو الاكتفاء بالاعتماد على dedup (الرسالة متطابقة).
  - **عدم** إطلاق توست لكل `generateInvoices` داخل اللوب — تجميع العداد محلياً.
  - في النهاية توست واحد مدمج: **«تم إنشاء N عقد و توليد M فاتورة للمستأجر …»**.

### C. توحيد قراءة ملخص الفواتير
- استخدام `useContractInvoiceSummary` (الموجودة فعلاً) في `useContractDelete`، وفي `useContractForm` (عبر `queryClient.fetchQuery` لأن السياق إجرائي وليس reactive).
- إزالة الاستعلامين اليدويين المكررين لـ `payment_invoices`.

### D. إضافة دالة `notifyInvoicesGenerated` للتمييز
في `src/lib/contracts/invoiceSync.ts`:
```
export function notifyInvoicesGenerated(count: number) {
  if (count > 0) uiNotify.success(`تم توليد ${count} فاتورة للعقد`);
}
```
ودمج `notifyInvoicesRegenerated` لتُستخدم فعلياً.

### E. ذاكرة المشروع
تحديث `mem://business-logic/contracts/invoice-sync-on-mutation` بإضافة:
> التوست في تدفق العقد يصدر من `hooks/page/` فقط عبر دوال `invoiceSync.ts`. data hooks للفواتير ممنوع منعاً قطعياً أن تطلق `uiNotify`.

## خارج النطاق
- تبديل `window.confirm` بـ AlertDialog (تغيير UI منفصل).
- منطق RPC/RLS/migrations.
- إنهاء عقد، AdvanceRequestDialog، dashboards.

## التحقق
1. `tsc --noEmit` نظيف.
2. `bun run lint -- --max-warnings 0`.
3. تحديث `usePaymentInvoices.test.ts` لإسقاط التحقق من توست (لم يعد في data layer).
4. اختبار يدوي على `/dashboard/contracts`:
   - إنشاء عقد single → توستان فقط (إضافة + توليد) برسالة صريحة.
   - إنشاء multi 3 وحدات → توست واحد مدمج فقط.
   - تعديل عقد بفواتير معلقة → «تم تحديث» + «تم إعادة توليد N فاتورة».
   - تعديل عقد بفواتير مدفوعة → confirm ثم نفس الزوج أعلاه (المدفوعة لا تُمسّ).
   - حذف عقد → كما هو (لا تغيير منطقي).
5. مراجعة بصرية: لا توست مكرر، لا «تم توليد» يظهر وحيداً بدون سياق.
