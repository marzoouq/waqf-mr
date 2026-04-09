/**
 * منطق أعمال طلبات السُلف — FSM والإشعارات
 * مُستخرج من useAdvanceRequests لفصل المسؤوليات
 */
import { supabase } from '@/integrations/supabase/client';
import { notifyAdmins, notifyUser } from '@/lib/services';
import { fmt } from '@/utils/format/format';

/** انتقالات الحالة المسموحة — FSM */
export const VALID_TRANSITIONS_TO: Record<string, string[]> = {
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
    supabase
      .from('beneficiaries')
      .select('user_id')
      .eq('id', beneficiaryId)
      .single()
      .then(({ data: benData }) => {
        if (benData?.user_id) {
          notifyUser(
            benData.user_id,
            'تم استلام طلب السلفة',
            `تم استلام طلبك بمبلغ ${fmt(amount)} ر.س وسيتم مراجعته من قبل الناظر.`,
            'info',
            '/beneficiary/my-share',
          );
        }
      });
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
  if (n) notifyUser(userId, n.title, n.message, n.type, '/beneficiary/my-share');
}
