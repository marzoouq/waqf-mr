import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Income } from '@/types/database';
import { toast } from 'sonner';

export const useIncome = () => {
  return useQuery({
    queryKey: ['income'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('income')
        .select('*, property:properties(*)')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Income[];
    },
  });
};

export const useCreateIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (income: Omit<Income, 'id' | 'created_at' | 'property' | 'contract'>) => {
      const { data, error } = await supabase
        .from('income')
        .insert(income)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
      toast.success('تم إضافة الدخل بنجاح');
      // Notify beneficiaries
      supabase.rpc('notify_all_beneficiaries', {
        p_title: 'دخل جديد',
        p_message: `تم تسجيل دخل جديد (${data.source}) بمبلغ ${Number(data.amount).toLocaleString('ar-SA')} ريال`,
        p_type: 'payment',
        p_link: '/beneficiary/disclosure',
      }).then();
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة الدخل');
    },
  });
};

export const useUpdateIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...income }: Partial<Income> & { id: string }) => {
      const { data, error } = await supabase
        .from('income')
        .update(income)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
      toast.success('تم تحديث الدخل بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث الدخل');
    },
  });
};

export const useDeleteIncome = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['income'] });
      toast.success('تم حذف الدخل بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف الدخل');
    },
  });
};
