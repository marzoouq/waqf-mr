/**
 * هوك تنفيذ التوزيع الفعلي مع خصم السُلف
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DistributionInput {
  beneficiary_id: string;
  beneficiary_name: string;
  share_amount: number;
  advances_paid: number;
  net_amount: number;
}

interface DistributeParams {
  account_id: string;
  fiscal_year_id?: string;
  distributions: DistributionInput[];
  total_distributed: number;
}

export const useDistributeShares = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ account_id, fiscal_year_id, distributions, total_distributed }: DistributeParams) => {
      const today = new Date().toISOString().split('T')[0];

      // 1. إنشاء سجلات التوزيع لكل مستفيد
      for (const dist of distributions) {
        if (dist.net_amount <= 0) continue;
        const { error } = await supabase
          .from('distributions')
          .insert({
            beneficiary_id: dist.beneficiary_id,
            account_id,
            amount: dist.net_amount,
            status: 'pending',
            date: today,
            fiscal_year_id: fiscal_year_id || null,
          } as any);
        if (error) throw error;
      }

      // 2. تحديث distributions_amount في الحساب الختامي
      const { error: accErr } = await supabase
        .from('accounts')
        .update({ distributions_amount: total_distributed })
        .eq('id', account_id);
      if (accErr) throw accErr;

      // 3. إرسال إشعار لجميع المستفيدين
      try {
        await supabase.rpc('notify_all_beneficiaries', {
          p_title: 'تم توزيع الحصص',
          p_message: `تم توزيع حصص الريع بإجمالي ${total_distributed.toLocaleString()} ر.س. يرجى مراجعة صفحة "حصتي من الريع".`,
          p_type: 'success',
          p_link: '/beneficiary/my-share',
        });
      } catch {
        // الإشعار اختياري، لا يمنع التوزيع
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['distributions'] });
      qc.invalidateQueries({ queryKey: ['my-distributions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      toast.success(`تم توزيع الحصص بنجاح لـ ${vars.distributions.filter(d => d.net_amount > 0).length} مستفيد`);
    },
    onError: () => toast.error('فشل تنفيذ التوزيع'),
  });
};
