/**
 * هوكات إدارة طلبات السُلف (advance_requests) + ترحيل الفروق السالبة
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyAdmins, notifyUser } from '@/utils/notifications';

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
    staleTime: 10_000, // M-08 fix: 10 ثوانٍ بدل دقيقة — عمليات مالية حساسة
    queryFn: async () => {
      let query = supabase
      .from('advance_requests')
        .select('*, beneficiary:beneficiaries(id, name, share_percentage, user_id)')
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
 * جلب طلبات سُلف مستفيد معين
 */
export const useMyAdvanceRequests = (beneficiaryId?: string) => {
  return useQuery({
    queryKey: ['advance_requests', 'my', beneficiaryId],
    staleTime: 10_000,
    queryFn: async () => {
      if (!beneficiaryId) return [];
      const { data, error } = await supabase
        .from('advance_requests')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AdvanceRequest[];
    },
    enabled: !!beneficiaryId,
  });
};

/**
 * إجمالي السُلف المصروفة لمستفيد في سنة مالية
 */
export const usePaidAdvancesTotal = (beneficiaryId?: string, fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_requests', 'paid_total', beneficiaryId, fiscalYearId],
    staleTime: 10_000,
    queryFn: async () => {
      if (!beneficiaryId) return 0;
      let query = supabase
        .from('advance_requests')
        .select('amount')
        .eq('beneficiary_id', beneficiaryId)
        .eq('status', 'paid');
      if (fiscalYearId) {
        query = query.eq('fiscal_year_id', fiscalYearId);
      }
      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return (data ?? []).reduce((sum: number, r: { amount: string | number }) => sum + Number(r.amount), 0);
    },
    enabled: !!beneficiaryId,
  });
};

/**
 * M-02 fix: جلب الفروق المرحّلة النشطة لمستفيد — تُفلتر بالسنة المالية المستهدفة (to_fiscal_year_id)
 * لضمان التوافق مع منطق DistributeDialog الذي يخصم بنفس الفلتر.
 */
export const useCarryforwardBalance = (beneficiaryId?: string, fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_carryforward', 'balance', beneficiaryId, fiscalYearId],
    staleTime: 10_000,
    queryFn: async () => {
      if (!beneficiaryId) return 0;
      let query = supabase
        .from('advance_carryforward')
        .select('amount')
        .eq('beneficiary_id', beneficiaryId)
        .eq('status', 'active');

      // M-02 fix: فلترة بالسنة المستهدفة أو الترحيلات بدون سنة محددة
      if (fiscalYearId) {
        query = query.or(`to_fiscal_year_id.eq.${fiscalYearId},to_fiscal_year_id.is.null`);
      }

      const { data, error } = await query.limit(1000);
      if (error) throw error;
      return (data ?? []).reduce((sum: number, r: { amount: string | number }) => sum + Number(r.amount), 0);
    },
    enabled: !!beneficiaryId,
  });
};

/**
 * جلب سجلات الترحيل لمستفيد
 */
export const useMyCarryforwards = (beneficiaryId?: string) => {
  return useQuery({
    queryKey: ['advance_carryforward', 'my', beneficiaryId],
    staleTime: 10_000,
    queryFn: async () => {
      if (!beneficiaryId) return [];
      const { data, error } = await supabase
        .from('advance_carryforward')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AdvanceCarryforward[];
    },
    enabled: !!beneficiaryId,
  });
};

/**
 * M-01 fix: جلب كل المرحّلات النشطة (للناظر) — يُفلتر بـ to_fiscal_year_id
 * ليتطابق مع منطق الخصم في DistributeDialog
 */
export const useAllCarryforwards = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_carryforward', 'all', fiscalYearId],
    staleTime: 10_000,
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
          .from('beneficiaries')
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
      toast.success('تم إرسال طلب السلفة بنجاح');
      const name = result._beneficiaryName || 'مستفيد';
      notifyAdmins(
        'طلب سلفة جديد',
        `طلب سلفة جديد من ${name} بمبلغ ${Number(vars.amount).toLocaleString()} ر.س`,
        'info',
        '/dashboard/beneficiaries',
      );
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
    mutationFn: async ({ id, status, rejection_reason, beneficiary_user_id, amount }: {
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
        const amtStr = amt ? Number(amt).toLocaleString() : '';
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