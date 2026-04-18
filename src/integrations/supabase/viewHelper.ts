/**
 * Helper لاستعلام Views من Supabase — يتجاوز قيد supabase.from() الذي لا يقبل أسماء Views مباشرة
 * بالرغم من أن الـ Views معرّفة في types.ts تحت Database['public']['Views']
 */
import { supabase } from './client';
import type { Database } from './types';

type ViewName = keyof Database['public']['Views'];

/**
 * استعلام view من Supabase مع type safety
 * يستخدم cast واحد عبر `unknown` بدلاً من `any` لتفادي تحذير ESLint مع الحفاظ على النوع الناتج
 */
export function fromView<T extends ViewName>(name: T) {
  return supabase.from(name as unknown as never);
}
