/**
 * منطق أعمال طلبات السُلف — FSM والإشعارات
 * مُستخرج من useAdvanceRequests لفصل المسؤوليات
 */
import { supabase } from '@/integrations/supabase/client';
import { notifyAdmins, enqueueUserNotification } from '@/lib/services';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format/format';

/** انتقالات الحالة المسموحة — FSM (داخلي) */
const VALID_TRANSITIONS_TO: Record<string, string[]> = {
  approved: ['pending'],
  rejected: ['pending', 'approved'],
  paid: ['approved'],
};

/** التحقق من صحة الحالة الجديدة */
export function validateTargetStatus(status: string): string[] | null {
  return VALID_TRANSITIONS_TO[status] ?? null;
}

/** بناء كائن التحديث حسب الحالة */
export function buildStatusUpdates(
  status: string,
  rejectionReason?: string,
): { status: string; approved_at?: string; paid_at?: string; rejection_reason?: string } {
  const updates: { status: string; approved_at?: string; paid_at?: string; rejection_reason?: string } = { status };
  if (status === 'approved') updates.approved_at = new Date().toISOString();
  if (status === 'paid') updates.paid_at = new Date().toISOString();
  if (rejectionReason) updates.rejection_reason = rejectionReason;
  return updates;
}

/** رسائل نجاح تغيير الحالة */
export const STATUS_SUCCESS_MESSAGES: Record<string, string> = {
  approved: 'تمت الموافقة على طلب السلفة',
  rejected: 'تم رفض طلب السلفة',
  paid: 'تم تأكيد صرف السلفة',
};

/** إشعار الإنشاء — يُرسل للناظر وللمستفيد */
export function notifyOnCreate(
  beneficiaryId: string,
  beneficiaryName: string | null,
  amount: number,
) {
  const name = beneficiaryName || 'مستفيد';
  notifyAdmins(
    'طلب سلفة جديد',
    `طلب سلفة جديد من ${name} بمبلغ ${fmt(amount)} ر.س`,
    'info',
    '/dashboard/beneficiaries',
  );
  if (beneficiaryId) {
    void (async () => {
      try {
        const { data: benData, error } = await supabase
          .from('beneficiaries')
          .select('user_id')
          .eq('id', beneficiaryId)
          .single();
        if (error) {
          logger.warn('[notifyOnCreate] failed to load beneficiary', { beneficiaryId, error });
          return;
        }
        if (benData?.user_id) {
          enqueueUserNotification(
            benData.user_id,
            'تم استلام طلب السلفة',
            `تم استلام طلبك بمبلغ ${fmt(amount)} ر.س وسيتم مراجعته من قبل الناظر.`,
            'info',
            '/beneficiary/my-share',
          );
        }
      } catch (e) {
        logger.warn('[notifyOnCreate] unexpected error', { beneficiaryId, error: e });
      }
    })();
  }
}

/** إشعار تغيير الحالة — يُرسل للمستفيد */
export function notifyOnStatusChange(
  userId: string | undefined,
  status: string,
  amount: number | undefined,
  rejectionReason?: string,
) {
  if (!userId) return;
  const amtStr = amount ? fmt(Number(amount)) : '';
  const notifMap: Record<string, { title: string; message: string; type: string }> = {
    approved: { title: 'تمت الموافقة على طلب السلفة', message: `تمت الموافقة على طلب السلفة بمبلغ ${amtStr} ر.س`, type: 'success' },
    rejected: { title: 'تم رفض طلب السلفة', message: `تم رفض طلب السلفة بمبلغ ${amtStr} ر.س${rejectionReason ? '. السبب: ' + rejectionReason : ''}`, type: 'warning' },
    paid: { title: 'تم صرف السلفة', message: `تم صرف سلفة بمبلغ ${amtStr} ر.س إلى حسابك`, type: 'success' },
  };
  const n = notifMap[status];
  if (n) enqueueUserNotification(userId, n.title, n.message, n.type, '/beneficiary/my-share');
}
