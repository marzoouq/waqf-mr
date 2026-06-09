/**
 * هوكات إدارة الوحدات (CRUD)
 * Audit-fix: استعلامات unitsService مدمجة محلياً (كان بمستهلك واحد).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createCrudFactory } from '../core/useCrudFactory';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { Unit } from '@/types';
import type { UnitInsert } from '@/types/models';
import { supabase } from '@/integrations/supabase/client';
import { contractsKeys } from '@/lib/queryKeys/contractsKeys';

// Re-export types for backward compatibility
export type UnitRow = Unit;
export type { UnitInsert };

export const UNITS_SELECT =
  'id, property_id, unit_number, unit_type, floor, area, status, notes, created_at, updated_at';

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
// Custom hooks (per-property listing + delete with cross-cache invalidation)
// ---------------------------------------------------------------------------

async function fetchUnitsByProperty(propertyId: string): Promise<Unit[]> {
  const { data, error } = await supabase
    .from('units')
    .select(UNITS_SELECT)
    .eq('property_id', propertyId)
    .order('unit_number');
  if (error) throw error;
  return data as Unit[];
}

/** Fetch units filtered by property_id */
export const useUnits = (propertyId?: string) => {
  return useQuery({
    queryKey: contractsKeys.units(propertyId),
    staleTime: STALE_STATIC,
    queryFn: () => fetchUnitsByProperty(propertyId!),
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
      queryClient.invalidateQueries({ queryKey: contractsKeys.prefixes.allUnits });
      queryClient.invalidateQueries({ queryKey: contractsKeys.units(propertyId) });
    },
  });
};
