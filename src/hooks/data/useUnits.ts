import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { createCrudFactory } from './useCrudFactory';
import { Unit } from '@/types/database';

// Re-export types for backward compatibility
export type UnitRow = Unit;
export type UnitInsert = {
  property_id: string;
  unit_number: string;
  unit_type?: string;
  floor?: string;
  area?: number;
  status?: string;
  notes?: string;
};

// ---------------------------------------------------------------------------
// Factory-based CRUD (all units, no filter)
// ---------------------------------------------------------------------------

const unitsCrud = createCrudFactory<'units', Unit>({
  table: 'units',
  queryKey: 'all-units',
  orderBy: 'unit_number',
  ascending: true,
  label: 'الوحدة',
  limit: 1000,
});

/** Fetch all units (no property filter) */
export const useAllUnits = unitsCrud.useList;
export const useCreateUnit = unitsCrud.useCreate;
export const useUpdateUnit = unitsCrud.useUpdate;

// ---------------------------------------------------------------------------
// Custom hooks that need special behavior
// ---------------------------------------------------------------------------

/** Fetch units filtered by property_id */
export const useUnits = (propertyId?: string) => {
  return useQuery({
    queryKey: ['units', propertyId],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('units')
        .select('id, property_id, unit_number, unit_type, floor, area, status, notes, created_at, updated_at')
        .eq('property_id', propertyId!)
        .order('unit_number');
      if (error) throw error;
      return data as Unit[];
    },
    enabled: !!propertyId,
  });
};

/** Delete unit – invalidates both 'all-units' and per-property caches */
export const useDeleteUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      const { error } = await supabase.from('units').delete().eq('id', id);
      if (error) throw error;
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      toast.success('تم حذف الوحدة بنجاح');
    },
    onError: () => toast.error('حدث خطأ أثناء حذف الوحدة'),
  });
};
