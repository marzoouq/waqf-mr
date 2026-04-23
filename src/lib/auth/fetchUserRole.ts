/**
 * دالة مشتركة لجلب دور المستخدم من جدول user_roles
 * تُستخدم في كلٍ من fetchRole (عند التهيئة) و refreshRole (عند التحديث)
 */
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types';

export interface FetchUserRoleResult {
  role: AppRole | null;
  error: Error | null;
}

export async function fetchUserRole(userId: string): Promise<FetchUserRoleResult> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      return { role: null, error };
    }

    return { role: data ? (data.role as AppRole) : null, error: null };
  } catch (err) {
    return { role: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}
