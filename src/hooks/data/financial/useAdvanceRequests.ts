/**
 * هوكات إدارة طلبات السُلف (advance_requests) — mutations فقط
 * الأنواع في src/hooks/financial/advanceTypes.ts
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { defaultNotify } from '@/lib/notify';
import {
  validateTargetStatus,
  buildStatusUpdates,
  STATUS_SUCCESS_MESSAGES,
  notifyOnCreate,
  notifyOnStatusChange,
} from '@/lib/services/advanceService';

// إعادة تصدير الأنواع والهوكات
export type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';
export {
  useMyBeneficiaryFinance,
  useAllCarryforwards,
} from './useAdvanceQueries';

/**
 * جلب طلبات السُلف — للناظر: الكل، للمستفيد: طلباته فقط (RLS تتكفل)
 * أعمدة صريحة بدل select('*') لتجنب تسريب حقول مستقبلية (#39)
 */
export const useAdvanceRequests = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_requests', fiscalYearId ?? 'all'],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      let query = supabase
      .from('advance_requests')
        .select('id, beneficiary_id, fiscal_year_id, amount, reason, status, rejection_reason, approved_by, approved_at, paid_at, created_at, beneficiary:beneficiaries(id, name, share_percentage, user_id), fiscal_year:fiscal_years(label)')
        .order('created_at', { ascending: false })
        .limit(100);
      if (fiscalYearId) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as import('@/types/advance').AdvanceRequest[];
    },
  });
};

/**
 * إنشاء طلب سلفة جديد (من المستفيد)
 * beneficiaryName يُمرَّر مباشرة لتجنب طلب شبكة إضافي (#33)
 */
export const useCreateAdvanceRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (req: {
      beneficiary_id: string;
      fiscal_year_id?: string;
      amount: number;
      reason?: string;
      beneficiaryName?: string;
    }) => {
      const { beneficiaryName, ...insertData } = req;
      const { data, error } = await supabase
        .from('advance_requests')
        .insert({ ...insertData, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return { ...data, _beneficiaryName: beneficiaryName ?? null };
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['my_beneficiary_finance'] });
      defaultNotify.success('تم إرسال طلب السلفة بنجاح');
      notifyOnCreate(result.beneficiary_id, result._beneficiaryName, Number(vars.amount));
    },
    onError: () => defaultNotify.error('فشل إرسال طلب السلفة'),
  });
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
      const allowedFrom = validateTargetStatus(status);
      if (!allowedFrom) throw new Error('حالة غير صالحة');

      const updates = buildStatusUpdates(status, rejection_reason);

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
      defaultNotify.success(STATUS_SUCCESS_MESSAGES[vars.status] || 'تم تحديث الطلب');
      notifyOnStatusChange(vars.beneficiary_user_id, vars.status, vars.amount, vars.rejection_reason);
    },
    onError: () => defaultNotify.error('فشل تحديث حالة الطلب'),
  });
};
