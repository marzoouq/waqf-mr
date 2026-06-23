/**
 * هوكات إدارة طلبات السُلف (advance_requests) — mutations فقط
 * الأنواع في src/hooks/financial/advanceTypes.ts
 *
 * لا توستات هنا (طبقة بيانات نقية). الإشعارات تظهر من hooks/page أو المكوّن.
 * إشعارات `notify*` تبقى لأنها push notifications للمستخدمين الآخرين عبر RPC.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { rpc } from '@/lib/api/rpc';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { advancesKeys } from '@/lib/queryKeys/advancesKeys';
import { financialKeys } from '@/lib/queryKeys/financialKeys';
import {
  notifyOnCreate,
  notifyOnStatusChange,
} from '@/lib/services/advanceService';

// إعادة تصدير الأنواع وهوكات data أخرى
export type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';
export { useAllCarryforwards } from '@/hooks/data/financial/advances/useAdvanceQueries';
export { STATUS_SUCCESS_MESSAGES } from '@/lib/services/advanceService';
// ملاحظة: useMyBeneficiaryFinance طبقة domain — استورده من
// '@/hooks/domain/financial/useAdvanceCalculations' مباشرة.

/**
 * جلب طلبات السُلف — للناظر: الكل، للمستفيد: طلباته فقط (RLS تتكفل)
 * أعمدة صريحة بدل select('*') لتجنب تسريب حقول مستقبلية (#39)
 */
export const useAdvanceRequests = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: advancesKeys.requestsByFiscalYear(fiscalYearId ?? 'all'),
    staleTime: STALE_FINANCIAL,
    queryFn: async ({ signal }) => {
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
      // nested join beneficiary+fiscal_year — cast مطلوب للعلاقة المتداخلة
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
      fiscal_year_id: string;
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
      qc.invalidateQueries({ queryKey: advancesKeys.prefixes.requests });
      qc.invalidateQueries({ queryKey: advancesKeys.prefixes.myFinance });
      // push notification للناظر — ليس toast UI
      notifyOnCreate(result.beneficiary_id, result._beneficiaryName, Number(vars.amount));
    },
  });
};

/**
 * تحديث حالة طلب السلفة (موافقة / رفض / صرف)
 * R2: ينفَّذ عبر RPC `update_advance_status` ضمن حارس السنة المفتوحة وصلاحيات الناظر/المحاسب.
 */
export const useUpdateAdvanceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason }: {
      id: string; status: string; rejection_reason?: string;
      beneficiary_user_id?: string; amount?: number;
    }) => {
      await rpc('update_advance_status', {
        p_id: id,
        p_status: status,
        p_rejection_reason: rejection_reason ?? null,
      });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: advancesKeys.prefixes.requests });
      qc.invalidateQueries({ queryKey: advancesKeys.prefixes.carryforward });
      qc.invalidateQueries({ queryKey: advancesKeys.prefixes.myFinance });
      if (vars.status === 'paid') qc.invalidateQueries({ queryKey: financialKeys.accounts.prefix });
      // push notification للمستفيد — ليس toast UI
      notifyOnStatusChange(vars.beneficiary_user_id, vars.status, vars.amount, vars.rejection_reason);
    },
  });
};
