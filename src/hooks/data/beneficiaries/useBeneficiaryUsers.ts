/**
 * هوك جلب المستخدمين المتاحين للربط بالمستفيدين
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';

export const useBeneficiaryUsers = (enabled: boolean) => {
  return useQuery({
    queryKey: ['beneficiary-users'],
    staleTime: STALE_FINANCIAL,
    enabled,
    queryFn: async () => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("يجب تسجيل الدخول أولاً");
      const { data, error } = await supabase.functions.invoke('admin-manage-users', {
        body: { action: 'list_users' },
      });
      if (error) throw error;
      return (data?.users || [])
        .filter((u: { role?: string }) => u.role === 'beneficiary')
        .map((u: { id: string; email?: string }) => ({ id: u.id, email: u.email || u.id }));
    },
  });
};
