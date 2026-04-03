/**
 * هوكات إدارة طلبات السُلف (advance_requests) — mutations فقط
 * الأنواع في src/types/advance.ts، الاستعلامات في advanceTypes.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME } from '@/lib/queryStaleTime';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { notifyAdmins, notifyUser } from '@/utils/notifications';
import { fmt } from '@/utils/format';

// إعادة تصدير الأنواع والهوكات
export type { AdvanceRequest, AdvanceCarryforward } from '@/hooks/financial/advanceTypes';
export {
  useMyBeneficiaryFinance,
  useMyAdvanceRequests,
  usePaidAdvancesTotal,
  useCarryforwardBalance,
  useMyCarryforwards,
  useAllCarryforwards,
} from './useAdvanceQueries';

/**
 * جلب طلبات السُلف — للناظر: الكل، للمستفيد: طلباته فقط (RLS تتكفل)
 */
export const useAdvanceRequests = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_requests', fiscalYearId ?? 'all'],
    staleTime: STALE_REALTIME,
    queryFn: async () => {
      let query = supabase
      .from('advance_requests')
        .select('*, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (fiscalYearId) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as import('@/hooks/financial/advanceTypes').AdvanceRequest[];
    },
  });
};

/**
 * إنشاء طلب سلفة جديد (من المستفيد)
 */
export const useCreateAdvanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: { beneficiary_id: string; fiscal_year_id?: string; amount: number; reason?: string }) => {
      const { data, error } = await supabase
        .from('advance_requests')
        .insert({ ...req, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      let beneficiaryName: string | null = null;
      try {
        const { data: ben, error: benError } = await supabase
          .from('beneficiaries_safe')
          .select('name')
          .eq('id', req.beneficiary_id)
          .single();
        if (!benError && ben) beneficiaryName = ben.name;
      } catch {
        // Non-critical
      }
      return { ...data, _beneficiaryName: beneficiaryName };
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['my_beneficiary_finance'] });
      defaultNotify.success('تم إرسال طلب السلفة بنجاح');
      const name = result._beneficiaryName || 'مستفيد';
      notifyAdmins(
        'طلب سلفة جديد',
        `طلب سلفة جديد من ${name} بمبلغ ${fmt(Number(vars.amount))} ر.س`,
        'info',
        '/dashboard/beneficiaries',
      );
      if (result.beneficiary_id) {
        supabase
          .from('beneficiaries')
          .select('user_id')
          .eq('id', result.beneficiary_id)
          .single()
          .then(({ data: benData }) => {
            if (benData?.user_id) {
              notifyUser(
                benData.user_id,
                'تم استلام طلب السلفة',
                `تم استلام طلبك بمبلغ ${fmt(Number(vars.amount))} ر.س وسيتم مراجعته من قبل الناظر.`,
                'info',
                '/beneficiary/my-share',
              );
            }
          });
      }
    },
    onError: () => defaultNotify.error('فشل إرسال طلب السلفة'),
  });
};

/** Allowed source statuses for each target status */
const VALID_TRANSITIONS_TO: Record<string, string[]> = {
  approved: ['pending'],
  rejected: ['pending', 'approved'],
  paid: ['approved'],
};

/**
 * تحديث حالة طلب السلفة (موافقة / رفض / صرف)
 */
export const useUpdateAdvanceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: {
      id: string; status: string; rejection_reason?: string;
      beneficiary_user_id?: string; amount?: number;
    }) => {
      const allowedFrom = VALID_TRANSITIONS_TO[status];
      if (!allowedFrom) throw new Error('حالة غير صالحة');

      const updates: { status: string; approved_at?: string; paid_at?: string; rejection_reason?: string } = { status };
      if (status === 'approved') updates.approved_at = new Date().toISOString();
      if (status === 'paid') updates.paid_at = new Date().toISOString();
      if (rejection_reason) updates.rejection_reason = rejection_reason;

      const { data, error } = await supabase
        .from('advance_requests')
        .update(updates)
        .eq('id', id)
        .in('status', allowedFrom)
        .select('id');
      if (error) throw error;
      if (!data?.length) throw new Error('لا يمكن تغيير الحالة — ربما تم تعديلها مسبقاً');
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['advance_carryforward'] });
      qc.invalidateQueries({ queryKey: ['my_beneficiary_finance'] });
      if (vars.status === 'paid') qc.invalidateQueries({ queryKey: ['accounts'] });
      const msgs: Record<string, string> = {
        approved: 'تمت الموافقة على طلب السلفة',
        rejected: 'تم رفض طلب السلفة',
        paid: 'تم تأكيد صرف السلفة',
      };
      defaultNotify.success(msgs[vars.status] || 'تم تحديث الطلب');

      const uid = vars.beneficiary_user_id;
      const amt = vars.amount;
      if (uid) {
        const amtStr = amt ? fmt(Number(amt)) : '';
        const notifMap: Record<string, { title: string; message: string; type: string }> = {
          approved: { title: 'تمت الموافقة على طلب السلفة', message: `تمت الموافقة على طلب السلفة بمبلغ ${amtStr} ر.س`, type: 'success' },
          rejected: { title: 'تم رفض طلب السلفة', message: `تم رفض طلب السلفة بمبلغ ${amtStr} ر.س${vars.rejection_reason ? '. السبب: ' + vars.rejection_reason : ''}`, type: 'warning' },
          paid: { title: 'تم صرف السلفة', message: `تم صرف سلفة بمبلغ ${amtStr} ر.س إلى حسابك`, type: 'success' },
        };
        const n = notifMap[vars.status];
        if (n) notifyUser(uid, n.title, n.message, n.type, '/beneficiary/my-share');
      }
    },
    onError: () => defaultNotify.error('فشل تحديث حالة الطلب'),
  });
};
