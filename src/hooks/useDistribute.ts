/**
 * هوك تنفيذ التوزيع الفعلي مع خصم السُلف وترحيل الفروق السالبة
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { notifyUser } from '@/utils/notifications';

interface DistributionInput {
  beneficiary_id: string;
  beneficiary_name: string;
  beneficiary_user_id?: string | null;
  share_amount: number;
  advances_paid: number;
  carryforward_deducted: number;
  net_amount: number;
  deficit: number; // فرق سالب يُرحّل
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

      for (const dist of distributions) {
        // 1. إنشاء سجل التوزيع (حتى لو الصافي صفر بسبب السلف)
        if (dist.net_amount > 0) {
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

        // 2. تسوية المرحّلات السابقة المخصومة
        if (dist.carryforward_deducted > 0) {
          // تحديث حالة المرحّلات القديمة إلى "مسوّى"
          const { data: activeCarryforwards } = await (supabase as any)
            .from('advance_carryforward')
            .select('id, amount')
            .eq('beneficiary_id', dist.beneficiary_id)
            .eq('status', 'active')
            .order('created_at', { ascending: true });

          let remaining = dist.carryforward_deducted;
          for (const cf of (activeCarryforwards ?? []) as any[]) {
            if (remaining <= 0) break;
            const cfAmount = Number(cf.amount);
            if (cfAmount <= remaining) {
              await (supabase as any)
                .from('advance_carryforward')
                .update({ status: 'settled' })
                .eq('id', cf.id);
              remaining -= cfAmount;
            } else {
              await (supabase as any)
                .from('advance_carryforward')
                .update({ amount: cfAmount - remaining })
                .eq('id', cf.id);
              remaining = 0;
            }
          }
        }

        // 3. إنشاء سجل ترحيل جديد إذا كان هناك فرق سالب
        if (dist.deficit > 0 && fiscal_year_id) {
          const { error: cfErr } = await supabase
            .from('advance_carryforward' as any)
            .insert({
              beneficiary_id: dist.beneficiary_id,
              from_fiscal_year_id: fiscal_year_id,
              amount: dist.deficit,
              status: 'active',
              notes: `ترحيل فرق سُلف من السنة المالية - ${dist.beneficiary_name}`,
            });
          if (cfErr) throw cfErr;

          // إشعار المستفيد بالفرق المرحّل
          if (dist.beneficiary_user_id) {
            notifyUser(
              dist.beneficiary_user_id,
              'ترحيل فرق سُلف',
              `تم ترحيل مبلغ ${dist.deficit.toLocaleString()} ر.س كفرق سُلف للسنة المالية القادمة`,
              'warning',
              '/beneficiary/my-share',
            );
          }
        }
      }

      // 4. تحديث distributions_amount في الحساب الختامي
      const { error: accErr } = await supabase
        .from('accounts')
        .update({ distributions_amount: total_distributed })
        .eq('id', account_id);
      if (accErr) throw accErr;

      // 5. إرسال إشعار لجميع المستفيدين
      try {
        await supabase.rpc('notify_all_beneficiaries', {
          p_title: 'تم توزيع الحصص',
          p_message: `تم توزيع حصص الريع بإجمالي ${total_distributed.toLocaleString()} ر.س. يرجى مراجعة صفحة "حصتي من الريع".`,
          p_type: 'success',
          p_link: '/beneficiary/my-share',
        });
      } catch {
        // الإشعار اختياري
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['distributions'] });
      qc.invalidateQueries({ queryKey: ['my-distributions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['advance_carryforward'] });
      const withShare = vars.distributions.filter(d => d.net_amount > 0).length;
      const withDeficit = vars.distributions.filter(d => d.deficit > 0).length;
      let msg = `تم توزيع الحصص بنجاح لـ ${withShare} مستفيد`;
      if (withDeficit > 0) msg += ` (${withDeficit} مستفيد لديهم فروق مرحّلة)`;
      toast.success(msg);
    },
    onError: () => {
      toast.error('فشل تنفيذ التوزيع — يرجى مراجعة البيانات يدوياً');
      // إعادة تحميل البيانات لعكس الحالة الفعلية بعد فشل جزئي محتمل
      qc.invalidateQueries({ queryKey: ['distributions'] });
      qc.invalidateQueries({ queryKey: ['my-distributions'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['advance_requests'] });
      qc.invalidateQueries({ queryKey: ['advance_carryforward'] });
    },
  });
};
