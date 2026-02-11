import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface UnitRow {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: string;
  floor: string | null;
  area: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UnitInsert {
  property_id: string;
  unit_number: string;
  unit_type?: string;
  floor?: string;
  area?: number;
  status?: string;
  notes?: string;
}

export const useAllUnits = () => {
  return useQuery({
    queryKey: ['all-units'],
    queryFn: async () => {
      const { data, error } = await supabase.from('units').select('*');
      if (error) throw error;
      return data as UnitRow[];
    },
  });
};

export const useUnits = (propertyId?: string) => {
  return useQuery({
    queryKey: ['units', propertyId],
    queryFn: async () => {
      let query = supabase.from('units').select('*').order('unit_number');
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as UnitRow[];
    },
    enabled: !!propertyId,
  });
};

export const useCreateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unit: UnitInsert) => {
      const { data, error } = await supabase.from('units').insert(unit).select().single();
      if (error) throw error;
      return data as UnitRow;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['units', variables.property_id] });
      toast.success('تم إضافة الوحدة بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء إضافة الوحدة'),
  });
};

export const useUpdateUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<UnitRow> & { id: string }) => {
      const { data, error } = await supabase.from('units').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data as UnitRow;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['units', data.property_id] });
      toast.success('تم تحديث الوحدة بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء تحديث الوحدة'),
  });
};

export const useDeleteUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      toast.success('تم حذف الوحدة بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء حذف الوحدة'),
  });
};
