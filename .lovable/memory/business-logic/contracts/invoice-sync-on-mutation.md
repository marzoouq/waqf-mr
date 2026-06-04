---
name: Contract Invoice Sync on Mutation
description: إنشاء/تعديل/حذف عقد ينعكس تلقائياً على payment_invoices دون لمس income المدفوع
type: feature
---

# مزامنة الفواتير عند تغيير العقد

## القاعدة

- **إنشاء عقد** → استدعاء فوري لـ `generate_contract_invoices(contract_id)` لتوليد فواتير الدفعات.
- **تعديل عقد** → حذف الفواتير المعلقة (`status='pending'`) وإعادة توليدها وفق القيم الجديدة. **الفواتير المدفوعة لا تُمسّ أبداً.** عند وجود مدفوع يظهر `window.confirm` يطلب تأكيد الناظر.
- **حذف عقد** → ممنوع إن وُجدت فواتير مدفوعة (`notifyDeleteBlockedByPaid`). مسموح cascade للفواتير المعلقة فقط مع تأكيد.

## المنطق محصور في

- `src/hooks/page/admin/contracts/useContractForm.ts` — توليد/إعادة توليد عند الحفظ.
- `src/hooks/page/admin/contracts/useContractDelete.ts` — حماية الأرشيف عند الحذف.
- `src/lib/contracts/invoiceSync.ts` — تأكيدات + إشعارات عربية موحّدة.
- `src/hooks/data/invoices/usePaymentInvoices.ts` — `useDeleteContractPendingInvoices` + `useContractInvoiceSummary`.

## ما لا يجب فعله

- **لا تُدرج `income` يدوياً.** سجلات `income` تُكتب حصراً عبر RPC `pay_invoice_and_record_collection` المُستدعى من `useMarkInvoicePaid`. هذه القاعدة موثّقة في Unified Collection Sync ولا يجوز كسرها.
- **لا تحذف فواتير مدفوعة** من أي مكان آخر — تنتهك ZATCA و ICV chain.
- **لا تستخدم `useDeleteContract` مباشرة** في الواجهة — استخدم `useContractDelete` أو `useContractForm` للحماية.
- **لا تطلق toast من `hooks/data/invoices/*`.** كل الإشعارات في تدفق العقد/الفواتير تصدر من طبقة الصفحة عبر دوال `lib/contracts/invoiceSync.ts` (`notifyInvoicesGenerated`, `notifyInvoicesRegenerated`, `notifyContractsCreatedWithInvoices`, `notifyDeleteBlockedByPaid`, `notifyPendingInvoicesDeleted`). data hooks تُبقي onSuccess للـ invalidate فقط.
- **لا تكرر استعلام `payment_invoices` يدوياً** قبل التعديل/الحذف — استخدم `fetchContractInvoiceSummary` أو `useContractInvoiceSummary`.

## التحقق

- اختبار يدوي: تعديل سعر عقد له فواتير مدفوعة + معلقة → المدفوعة بنفس القيمة، المعلقة تظهر بالسعر الجديد.
- SQL: `SELECT count(*) FROM income i LEFT JOIN payment_invoices p ON i.invoice_id=p.id WHERE p.id IS NULL` يجب أن يساوي 0.
