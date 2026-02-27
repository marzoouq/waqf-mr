import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TenantPayment {
  id: string;
  contract_id: string;
  paid_months: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface UpsertPaymentParams {
  contract_id: string;
  paid_months: number;
  notes?: string;
  /** بيانات إضافية لإنشاء سجل دخل تلقائي عند زيادة الدفعات */
  auto_income?: {
    payment_amount: number;
    property_id: string;
    fiscal_year_id: string | null;
    tenant_name: string;
  };
}

export const useTenantPayments = () => {
  return useQuery({
    queryKey: ['tenant_payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenant_payments')
        .select('*')
        .limit(500);
      if (error) throw error;
      return data as TenantPayment[];
    },
    staleTime: 60_000,
  });
};

export const useUpsertTenantPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payment: UpsertPaymentParams) => {
      // 1) جلب عدد الدفعات الحالي
      const { data: existing } = await supabase
        .from('tenant_payments')
        .select('paid_months')
        .eq('contract_id', payment.contract_id)
        .maybeSingle();

      const oldPaidMonths = existing?.paid_months ?? 0;

      // 2) تحديث/إنشاء سجل التحصيل
      const { data, error } = await supabase
        .from('tenant_payments')
        .upsert(
          {
            contract_id: payment.contract_id,
            paid_months: payment.paid_months,
            notes: payment.notes || null,
          },
          { onConflict: 'contract_id' }
        )
        .select()
        .single();
      if (error) throw error;

      // 3) إنشاء سجل دخل تلقائي إذا زادت الدفعات
      if (
        payment.auto_income &&
        payment.paid_months > oldPaidMonths &&
        payment.auto_income.payment_amount > 0
      ) {
        const diff = payment.paid_months - oldPaidMonths;
        const incomeRecords = Array.from({ length: diff }, (_, i) => ({
          source: `إيجار - ${payment.auto_income!.tenant_name}`,
          amount: payment.auto_income!.payment_amount,
          date: new Date().toISOString().split('T')[0],
          property_id: payment.auto_income!.property_id,
          contract_id: payment.contract_id,
          fiscal_year_id: payment.auto_income!.fiscal_year_id,
          notes: `تحصيل تلقائي - الدفعة رقم ${oldPaidMonths + i + 1}`,
        }));

        const { error: incomeError } = await supabase
          .from('income')
          .insert(incomeRecords);

        if (incomeError) {
          // فشل إنشاء سجل الدخل التلقائي — toast يكفي للمستخدم
          // لا نرمي خطأ هنا حتى لا نفقد تحديث التحصيل الذي نجح بالفعل
          toast.error('تم تحديث التحصيل لكن فشل إنشاء سجل الدخل تلقائياً');
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      toast.success('تم حفظ بيانات التحصيل');
    },
    onError: (error: Error) => {
      toast.error('خطأ في حفظ بيانات التحصيل: ' + error.message);
    },
  });
};
