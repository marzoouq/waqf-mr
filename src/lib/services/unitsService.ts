/**
 * unitsService — استعلامات/CUD جدول `units`.
 * مستخرج من useUnits.ts ضمن M2.6.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Unit } from '@/types';

export const UNITS_SELECT =
  'id, property_id, unit_number, unit_type, floor, area, status, notes, created_at, updated_at';

export const unitsService = {
  /** قائمة الوحدات لعقار محدد (مرتبة حسب unit_number) */
  async listByProperty(propertyId: string): Promise<Unit[]> {
    const { data, error } = await supabase
      .from('units')
      .select(UNITS_SELECT)
      .eq('property_id', propertyId)
      .order('unit_number');
    if (error) throw error;
    return data as Unit[];
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('units').delete().eq('id', id);
    if (error) throw error;
  },
};
