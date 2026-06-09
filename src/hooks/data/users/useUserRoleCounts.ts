/**
 * Hook لجلب أعداد المستخدمين حسب الدور (لبطاقات الإحصاء في صفحة إدارة المستخدمين)
 * مصدر البيانات: جدول user_roles (RLS: admin only)
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { adminUsersKeys } from '@/lib/queryKeys/adminUsersKeys';

export type UserRoleCounts = {
  total: number;
  admin: number;
  accountant: number;
  beneficiary: number;
  waqif: number;
};

export const useUserRoleCounts = () => {
  return useQuery({
    queryKey: adminUsersKeys.roleCounts,
    queryFn: async (): Promise<UserRoleCounts> => {
      const { data, error } = await supabase.from('user_roles').select('role');
      if (error) throw error;
      const counts: UserRoleCounts = { total: 0, admin: 0, accountant: 0, beneficiary: 0, waqif: 0 };
      (data ?? []).forEach((r: { role: string }) => {
        counts.total += 1;
        if (r.role in counts) counts[r.role as keyof UserRoleCounts] += 1;
      });
      return counts;
    },
    staleTime: 60_000,
  });
};
