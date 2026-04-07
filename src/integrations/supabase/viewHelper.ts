/**
 * Helper لاستعلام Views من Supabase — يتجاوز قيد supabase.from() الذي لا يقبل أسماء Views مباشرة
 * بالرغم من أن الـ Views معرّفة في types.ts تحت Database['public']['Views']
 */
import { supabase } from './client';
import type { Database } from './types';

type ViewName = keyof Database['public']['Views'];

/**
 * استعلام view من Supabase مع type safety
 * يستخدم `as any` داخلياً مرة واحدة فقط بدلاً من تكراره في كل مكان
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- ضروري لأن supabase.from() لا يقبل أسماء Views
export function fromView<T extends ViewName>(name: T) {
  return supabase.from(name as any);
}
