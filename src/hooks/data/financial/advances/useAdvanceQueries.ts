/**
 * هوكات الترحيل والسُلف — الأنواع في src/hooks/financial/advanceTypes.ts
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME } from '@/lib/queryStaleTime';
import type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';

// إعادة تصدير الأنواع للتوافقية
export type { AdvanceRequest, AdvanceCarryforward } from '@/types/advance';

// ---------------------------------------------------------------------------
// طبقة data: استعلام raw للسلف + الترحيلات (بدون حسابات).
// الحسابات (المجاميع/الأرصدة) في طبقة domain:
//   `src/hooks/domain/financial/useAdvanceCalculations.ts#useMyBeneficiaryFinance`
// ---------------------------------------------------------------------------
export interface MyBeneficiaryFinanceRaw {
  advances: AdvanceRequest[];
  carryforwards: AdvanceCarryforward[];
}

export const useMyBeneficiaryFinanceRaw = (beneficiaryId?: string) => {
  return useQuery({
    queryKey: ['my_beneficiary_finance_raw', beneficiaryId],
    staleTime: STALE_REALTIME,
    queryFn: async (): Promise<MyBeneficiaryFinanceRaw> => {
      if (!beneficiaryId) return { advances: [], carryforwards: [] };

      const [advRes, cfRes] = await Promise.all([
        supabase
          .from('advance_requests')
          .select('id, beneficiary_id, fiscal_year_id, amount, reason, status, rejection_reason, approved_by, approved_at, paid_at, created_at')
          .eq('beneficiary_id', beneficiaryId)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('advance_carryforward')
          .select('id, beneficiary_id, from_fiscal_year_id, to_fiscal_year_id, amount, status, notes, created_at')
          .eq('beneficiary_id', beneficiaryId)
          .order('created_at', { ascending: false })
          .limit(100),
      ]);

      if (advRes.error) throw advRes.error;
      if (cfRes.error) throw cfRes.error;

      return {
        advances: (advRes.data ?? []) as unknown as AdvanceRequest[],
        carryforwards: (cfRes.data ?? []) as unknown as AdvanceCarryforward[],
      };
    },
    enabled: !!beneficiaryId,
  });
};

// ملاحظة: useMyBeneficiaryFinance (دالة الحساب) في طبقة domain —
// استورده مباشرة من '@/hooks/domain/financial/useAdvanceCalculations'.




/**
 * M-01 fix: جلب كل المرحّلات النشطة (للناظر) — يُفلتر بـ to_fiscal_year_id
 */
export const useAllCarryforwards = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_carryforward', 'all', fiscalYearId],
    staleTime: STALE_REALTIME,
    queryFn: async () => {
      let query = supabase
        .from('advance_carryforward')
        .select('*, beneficiary:beneficiaries(id, name)')
        .eq('status', 'active');
      if (fiscalYearId) {
        query = query.or(`to_fiscal_year_id.eq.${fiscalYearId},to_fiscal_year_id.is.null`);
      }
      const { data, error } = await query.limit(500);
      if (error) throw error;
      // nested join beneficiary:beneficiaries — cast مطلوب للعلاقة
      return (data ?? []) as unknown as (AdvanceCarryforward & { beneficiary?: { id: string; name: string } })[];
    },
  });
};
