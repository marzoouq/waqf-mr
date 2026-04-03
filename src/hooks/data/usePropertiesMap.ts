/**
 * هوك لجلب خريطة أسماء العقارات حسب المعرّفات
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';

/** يُعيد خريطة { [propertyId]: اسم العقار } */
export const usePropertiesMap = (propertyIds: string[]) => {
  return useQuery({
    queryKey: ['properties_names', propertyIds],
    enabled: propertyIds.length > 0,
    staleTime: STALE_STATIC,
    queryFn: async () => {
      const { data } = await supabase
        .from('properties')
        .select('id, property_number, location')
        .in('id', propertyIds);
      const map: Record<string, string> = {};
      (data ?? []).forEach(p => { map[p.id] = p.property_number || p.location; });
      return map;
    },
  });
};
