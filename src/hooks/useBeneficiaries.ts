import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Beneficiary } from '@/types/database';
import { toast } from 'sonner';
import { notifyAdmins } from '@/utils/notifications';

export const useBeneficiaries = () => {
  return useQuery({
    queryKey: ['beneficiaries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Beneficiary[];
    },
  });
};

export const useCreateBeneficiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (beneficiary: Omit<Beneficiary, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .insert(beneficiary)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('تم إضافة المستفيد بنجاح');
      notifyAdmins(
        'مستفيد جديد',
        `تم تسجيل مستفيد جديد: ${data.name}`,
        'info',
        '/dashboard/beneficiaries',
      );
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة المستفيد');
    },
  });
};

export const useUpdateBeneficiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...beneficiary }: Partial<Beneficiary> & { id: string }) => {
      const { data, error } = await supabase
        .from('beneficiaries')
        .update(beneficiary)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('تم تحديث المستفيد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث المستفيد');
    },
  });
};

export const useDeleteBeneficiary = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiaries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'] });
      toast.success('تم حذف المستفيد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف المستفيد');
    },
  });
};
