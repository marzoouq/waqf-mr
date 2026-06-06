/**
 * بيانات واستعلامات إدارة المستخدمين
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invoke } from '@/lib/api/invoke';
import { ApiError } from '@/lib/api/rpc';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

export interface ManagedUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
}

// callAdminApi يحافظ على عقد "throw Error مع رسالة، يعيد payload" — لا tuple shape
export const callAdminApi = async (body: Record<string, unknown>) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("يجب تسجيل الدخول أولاً");
  try {
    return await invoke<Record<string, unknown>>('admin-manage-users', { body });
  } catch (e) {
    if (e instanceof ApiError) throw new Error(e.message);
    throw e;
  }
};


export const useAdminUsers = (currentPage: number) => {
  const { user: currentUser } = useAuth();
  return useQuery({
    queryKey: ['admin-users', currentPage],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const result = await callAdminApi({ action: 'list_users', page: currentPage });
      return {
        users: result.users as ManagedUser[],
        total: (result.total as number) ?? (result.users as ManagedUser[]).length,
        nextPage: (result.nextPage as number | null) ?? null,
      };
    },
    enabled: !!currentUser,
    // smart retry: لا إعادة محاولة عند فشل المصادقة (#10)
    retry: (count, error) => {
      const msg = (error as Error)?.message ?? '';
      if (msg.includes('يجب تسجيل') || msg.includes('unauthorized')) return false;
      return count < 2;
    },
  });
};

export const useOrphanedBeneficiaries = (enabled = true) => {
  const { user: currentUser } = useAuth();
  return useQuery({
    queryKey: ['orphaned-beneficiaries'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, name, email, user_id')
        .or('email.is.null,email.eq."",user_id.is.null');
      return data || [];
    },
    enabled: enabled && !!currentUser,
  });
};

export const useUnlinkedBeneficiaries = (enabled = true) => {
  const { user: currentUser } = useAuth();
  return useQuery({
    queryKey: ['unlinked-beneficiaries'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries')
        .select('id, name, user_id')
        .is('user_id', null);
      return data || [];
    },
    enabled: enabled && !!currentUser,
  });
};
