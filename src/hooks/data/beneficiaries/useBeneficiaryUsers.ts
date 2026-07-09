/**
 * هوك جلب المستخدمين المتاحين للربط بالمستفيدين
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { beneficiariesKeys } from '@/lib/queryKeys/beneficiariesKeys';

interface AdminUserRow { id: string; email?: string; role?: string }

export const useBeneficiaryUsers = (enabled: boolean) => {
  return useQuery({
    queryKey: beneficiariesKeys.users(),
    staleTime: STALE_FINANCIAL,
    enabled,
    queryFn: async ({ signal }) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("يجب تسجيل الدخول أولاً");
      const data = await invoke<{ users?: AdminUserRow[] }>('admin-manage-users', {
        body: { action: 'list_users' },
      });
      return (data?.users || [])
        .filter((u) => u.role === 'beneficiary')
        .map((u) => ({ id: u.id, email: u.email || u.id }));
    },
  });
};
