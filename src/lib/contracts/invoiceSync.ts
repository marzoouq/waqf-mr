/**
 * إشعارات وتأكيدات مزامنة الفواتير مع تعديلات العقد.
 * منطق side-effect مركّز هنا (lib/) لا في utils/ ولا hooks/data/.
 *
 * قاعدة المشروع: سجلات `income` تُكتب حصراً عبر RPC `pay_invoice_and_record_collection`؛
 * هذه الدوال تنسّق الفواتير فقط — لا تُدرج income يدوياً.
 */
import { uiNotify } from '@/lib/notify';

export function notifyInvoicesRegenerated(count: number) {
  if (count > 0) {
    uiNotify.success(`تم إعادة توليد ${count} فاتورة معلقة وفق القيم الجديدة`);
  } else {
    uiNotify.info('تم تحديث العقد — لا توجد فواتير معلقة لإعادة توليدها');
  }
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

/**
 * تأكيد عربي مزدوج قبل التعديل عند وجود فواتير مدفوعة.
 * يستخدم `window.confirm` (النمط القياسي للتأكيدات الحاسمة في المشروع).
 */
export function confirmRegenerateWithPaid(paidCount: number, pendingCount: number): boolean {
  if (typeof window === 'undefined') return true;
  const msg = [
    `هذا العقد لديه ${paidCount} فاتورة مدفوعة محفوظة (لن تُمسّ).`,
    pendingCount > 0
      ? `سيتم حذف ${pendingCount} فاتورة معلقة وإعادة توليدها وفق القيم الجديدة.`
      : 'سيتم توليد فواتير جديدة للفترات المتبقية.',
    'هل تريد المتابعة؟',
  ].join('\n\n');
  return window.confirm(msg);
}

/**
 * تأكيد عربي قبل حذف عقد بفواتير معلقة فقط.
 */
export function confirmDeleteWithPending(pendingCount: number, contractName: string): boolean {
  if (typeof window === 'undefined') return true;
  return window.confirm(
    `سيتم حذف العقد «${contractName}» مع ${pendingCount} فاتورة معلقة مرتبطة به.\n\nهل تريد المتابعة؟`,
  );
}
