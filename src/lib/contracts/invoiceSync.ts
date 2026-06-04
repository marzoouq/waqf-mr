/**
 * إشعارات وتأكيدات مزامنة الفواتير مع تعديلات العقد.
 * منطق side-effect مركّز هنا (lib/) لا في utils/ ولا hooks/data/.
 *
 * قاعدة المشروع: سجلات `income` تُكتب حصراً عبر RPC `pay_invoice_and_record_collection`؛
 * هذه الدوال تنسّق الفواتير فقط — لا تُدرج income يدوياً.
 *
 * ملاحظة Batch 2E: أُزيلت `confirmRegenerateWithPaid` و`confirmDeleteWithPending`
 * المعتمدة على `window.confirm`؛ التأكيدات الآن عبر AlertDialog في طبقة الواجهة.
 */
import { uiNotify } from '@/lib/notify';

export function notifyInvoicesGenerated(count: number) {
  if (count > 0) {
    uiNotify.success(`تم توليد ${count} فاتورة للعقد`);
  }
}

export function notifyInvoicesRegenerated(count: number) {
  if (count > 0) {
    uiNotify.success(`تم إعادة توليد ${count} فاتورة معلقة وفق القيم الجديدة`);
  } else {
    uiNotify.info('تم تحديث العقد — لا توجد فواتير معلقة لإعادة توليدها');
  }
}

export function notifyContractsCreatedWithInvoices(
  tenantName: string,
  contractCount: number,
  invoiceCount: number,
) {
  const parts = [`تم إنشاء ${contractCount} عقد للمستأجر ${tenantName}`];
  if (invoiceCount > 0) parts.push(`وتوليد ${invoiceCount} فاتورة`);
  uiNotify.success(parts.join(' و'));
}

export function notifyDeleteBlockedByPaid(paidCount: number) {
  uiNotify.error(
    `لا يمكن حذف هذا العقد — يحتوي على ${paidCount} فاتورة مدفوعة محفوظة بالأرشيف المحاسبي.`,
    { duration: 6000 },
  );
}

export function notifyPendingInvoicesDeleted(count: number) {
  if (count > 0) {
    uiNotify.info(`تم حذف ${count} فاتورة معلقة مرتبطة بالعقد`);
  }
}
