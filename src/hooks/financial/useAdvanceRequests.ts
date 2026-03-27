/**
 * هوكات إدارة طلبات السُلف (advance_requests) + ترحيل الفروق السالبة
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_REALTIME } from '@/lib/queryStaleTime';
import { toast } from 'sonner';
import { notifyAdmins, notifyUser } from '@/utils/notifications';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';

export interface AdvanceRequest {
  id: string;
  beneficiary_id: string;
  fiscal_year_id: string | null;
  amount: number;
  reason: string | null;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  rejection_reason: string | null;
  approved_by: string | null;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  beneficiary?: { id: string; name: string; share_percentage: number; user_id: string | null };
  fiscal_year?: { label: string } | null;
}

export interface AdvanceCarryforward {
  id: string;
  beneficiary_id: string;
  from_fiscal_year_id: string;
  to_fiscal_year_id: string | null;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

/**
 * جلب طلبات السُلف — للناظر: الكل، للمستفيد: طلباته فقط (RLS تتكفل)
 */
export const useAdvanceRequests = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_requests', fiscalYearId ?? 'all'],
    staleTime: STALE_REALTIME, // M-08 fix: 10 ثوانٍ بدل دقيقة — عمليات مالية حساسة
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
      return (data ?? []) as unknown as AdvanceRequest[];
    },
  });
};

/**
 * هوك مدمج لبيانات المستفيد: سُلف + ترحيلات في استعلامين متوازيين بدل 4 منفصلة
 * يحسب paidAdvancesTotal و carryforwardBalance من البيانات المجلوبة محلياً
 */
export const useMyBeneficiaryFinance = (beneficiaryId?: string, fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['my_beneficiary_finance', beneficiaryId, fiscalYearId ?? 'all'],
    staleTime: STALE_REALTIME,
    queryFn: async () => {
      if (!beneficiaryId) return { advances: [] as AdvanceRequest[], carryforwards: [] as AdvanceCarryforward[] };

      // استعلامان متوازيان بدل 4
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
    select: (raw) => {
      // حساب مشتقات من البيانات المجلوبة — بدل استعلامات منفصلة
      const paidAdvancesTotal = raw.advances
        .filter(a => a.status === 'paid' && (!fiscalYearId || a.fiscal_year_id === fiscalYearId))
        .reduce((sum, a) => sum + safeNumber(a.amount), 0);

      const carryforwardBalance = raw.carryforwards
        .filter(c => c.status === 'active' && (!fiscalYearId || c.to_fiscal_year_id === fiscalYearId || !c.to_fiscal_year_id))
        .reduce((sum, c) => sum + safeNumber(c.amount), 0);

      return {
        myAdvances: raw.advances,
        myCarryforwards: raw.carryforwards,
        paidAdvancesTotal,
        carryforwardBalance,
      };
    },
  });
};

// ─── Backward-compatible aliases ───
/** @deprecated استخدم useMyBeneficiaryFinance بدلاً منه */
export const useMyAdvanceRequests = (beneficiaryId?: string) => {
  const q = useMyBeneficiaryFinance(beneficiaryId);
  return { ...q, data: q.data?.myAdvances ?? [] };
};
/** @deprecated استخدم useMyBeneficiaryFinance بدلاً منه */
export const usePaidAdvancesTotal = (beneficiaryId?: string, fiscalYearId?: string) => {
  const q = useMyBeneficiaryFinance(beneficiaryId, fiscalYearId);
  return { ...q, data: q.data?.paidAdvancesTotal ?? 0 };
};
/** @deprecated استخدم useMyBeneficiaryFinance بدلاً منه */
export const useCarryforwardBalance = (beneficiaryId?: string, fiscalYearId?: string) => {
  const q = useMyBeneficiaryFinance(beneficiaryId, fiscalYearId);
  return { ...q, data: q.data?.carryforwardBalance ?? 0 };
};
/** @deprecated استخدم useMyBeneficiaryFinance بدلاً منه */
export const useMyCarryforwards = (beneficiaryId?: string) => {
  const q = useMyBeneficiaryFinance(beneficiaryId);
  return { ...q, data: q.data?.myCarryforwards ?? [] };
};

/**
 * M-01 fix: جلب كل المرحّلات النشطة (للناظر) — يُفلتر بـ to_fiscal_year_id
 * ليتطابق مع منطق الخصم في DistributeDialog
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
        // M-01 fix: استخدام to_fiscal_year_id بدل from_fiscal_year_id
        query = query.or(`to_fiscal_year_id.eq.${fiscalYearId},to_fiscal_year_id.is.null`);
      }
      const { data, error } = await query.limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as (AdvanceCarryforward & { beneficiary?: { id: string; name: string } })[];
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
      // جلب اسم المستفيد لاستخدامه في الإشعار (FIX H-03: error handling)
      let beneficiaryName: string | null = null;
      try {
        const { data: ben, error: benError } = await supabase
          .from('beneficiaries_safe')
          .select('name')
          .eq('id', req.beneficiary_id)
          .single();
        if (!benError && ben) beneficiaryName = ben.name;
      } catch {
        // Non-critical — notification will use fallback name
      }
      return { ...data, _beneficiaryName: beneficiaryName };
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['my_beneficiary_finance'] });
      toast.success('تم إرسال طلب السلفة بنجاح');
      const name = result._beneficiaryName || 'مستفيد';
      notifyAdmins(
        'طلب سلفة جديد',
        `طلب سلفة جديد من ${name} بمبلغ ${fmt(Number(vars.amount))} ر.س`,
        'info',
        '/dashboard/beneficiaries',
      );
      // إشعار تأكيد استلام للمستفيد نفسه (fire-and-forget)
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
    onError: () => toast.error('فشل إرسال طلب السلفة'),
  });
};

/**
 * تحديث حالة طلب السلفة (موافقة / رفض / صرف)
 */
/** Allowed source statuses for each target status (reverse map for atomic UPDATE) */
const VALID_TRANSITIONS_TO: Record<string, string[]> = {
  approved: ['pending'],
  rejected: ['pending', 'approved'],
  paid: ['approved'],
};

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
      if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
      }
      if (status === 'paid') {
        updates.paid_at = new Date().toISOString();
      }
      if (rejection_reason) {
        updates.rejection_reason = rejection_reason;
      }

      // Atomic: UPDATE only if current status is in the allowed list
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
      // M-04 fix: invalidate carryforward and accounts too
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['advance_carryforward'] });
      qc.invalidateQueries({ queryKey: ['my_beneficiary_finance'] });
      if (vars.status === 'paid') {
        qc.invalidateQueries({ queryKey: ['accounts'] });
      }
      const msgs: Record<string, string> = {
        approved: 'تمت الموافقة على طلب السلفة',
        rejected: 'تم رفض طلب السلفة',
        paid: 'تم تأكيد صرف السلفة',
      };
      toast.success(msgs[vars.status] || 'تم تحديث الطلب');

      // إشعار المستفيد
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
    onError: () => toast.error('فشل تحديث حالة الطلب'),
  });
};