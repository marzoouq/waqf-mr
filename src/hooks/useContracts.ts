import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Contract } from '@/types/database';
import { toast } from 'sonner';

export const useContracts = () => {
  return useQuery({
    queryKey: ['contracts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, property:properties(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Contract[];
    },
  });
};

export const useCreateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contract: Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'property'>) => {
      const { data, error } = await supabase
        .from('contracts')
        .insert(contract)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('تم إضافة العقد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إضافة العقد');
    },
  });
};

export const useUpdateContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...contract }: Partial<Contract> & { id: string }) => {
      const { data, error } = await supabase
        .from('contracts')
        .update(contract)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('تم تحديث العقد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث العقد');
    },
  });
};

export const useDeleteContract = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('تم حذف العقد بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف العقد');
    },
  });
};
