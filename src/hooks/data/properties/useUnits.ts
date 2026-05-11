import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { defaultNotify } from '@/lib/notify';
import { createCrudFactory } from '../core/useCrudFactory';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { Unit } from '@/types';
import type { UnitInsert } from '@/types/models';
import { unitsService } from '@/lib/services/unitsService';

// Re-export types for backward compatibility
export type UnitRow = Unit;
export type { UnitInsert };

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
export const unitsQueryOptions = unitsCrud.getQueryOptions;

// ---------------------------------------------------------------------------
// Custom hooks that need special behavior (M2.6: via unitsService)
// ---------------------------------------------------------------------------

/** Fetch units filtered by property_id */
export const useUnits = (propertyId?: string) => {
  return useQuery({
    queryKey: ['units', propertyId],
    staleTime: STALE_STATIC,
    queryFn: () => unitsService.listByProperty(propertyId!),
    enabled: !!propertyId,
  });
};

/** Delete unit – invalidates both 'all-units' and per-property caches */
export const useDeleteUnit = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, propertyId }: { id: string; propertyId: string }) => {
      await unitsService.remove(id);
      return propertyId;
    },
    onSuccess: (propertyId) => {
      queryClient.invalidateQueries({ queryKey: ['all-units'] });
      queryClient.invalidateQueries({ queryKey: ['units', propertyId] });
      defaultNotify.success('تم حذف الوحدة بنجاح');
    },
    onError: () => defaultNotify.error('حدث خطأ أثناء حذف الوحدة'),
  });
};
