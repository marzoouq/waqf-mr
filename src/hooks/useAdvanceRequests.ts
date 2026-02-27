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
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
      .from('advance_requests')
        .select('*, beneficiary:beneficiaries(id, name, share_percentage, user_id)')
        .order('created_at', { ascending: false })
        .limit(500);
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
    staleTime: 60_000,
    queryFn: async () => {
      if (!beneficiaryId) return [];
      const { data, error } = await supabase
        .from('advance_requests')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false })
        .limit(500);
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
    staleTime: 60_000,
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
      const { data, error } = await query.limit(200);
      if (error) throw error;
      return (data ?? []).reduce((sum: number, r: { amount: string | number }) => sum + Number(r.amount), 0);
    },
    enabled: !!beneficiaryId,
  });
};

/**
 * جلب الفروق المرحّلة النشطة لمستفيد (من سنوات سابقة)
 */
export const useCarryforwardBalance = (beneficiaryId?: string, fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_carryforward', beneficiaryId, fiscalYearId],
    staleTime: 60_000,
    queryFn: async () => {
      if (!beneficiaryId) return 0;
      // جلب كل المرحّل النشط الذي يستهدف هذه السنة أو بدون سنة مستهدفة
      let query = supabase
        .from('advance_carryforward')
        .select('amount')
        .eq('beneficiary_id', beneficiaryId)
        .eq('status', 'active');

      const { data, error } = await query.limit(200);
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
    staleTime: 60_000,
    queryFn: async () => {
      if (!beneficiaryId) return [];
      const { data, error } = await supabase
        .from('advance_carryforward')
        .select('*')
        .eq('beneficiary_id', beneficiaryId)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as AdvanceCarryforward[];
    },
    enabled: !!beneficiaryId,
  });
};

/**
 * جلب كل المرحّلات النشطة (للناظر) لسنة مالية محددة
 */
export const useAllCarryforwards = (fiscalYearId?: string) => {
  return useQuery({
    queryKey: ['advance_carryforward', 'all', fiscalYearId],
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase
        .from('advance_carryforward')
        .select('*, beneficiary:beneficiaries(id, name)')
        .eq('status', 'active');
      if (fiscalYearId) {
        query = query.eq('from_fiscal_year_id', fiscalYearId);
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
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      toast.success('تم إرسال طلب السلفة بنجاح');
      notifyAdmins(
        'طلب سلفة جديد',
        `طلب سلفة جديد بمبلغ ${Number(vars.amount).toLocaleString()} ر.س`,
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
export const useUpdateAdvanceStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, rejection_reason, beneficiary_user_id, amount }: {
      id: string; status: string; rejection_reason?: string;
      beneficiary_user_id?: string; amount?: number;
    }) => {
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
      const { error } = await supabase
        .from('advance_requests')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
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
