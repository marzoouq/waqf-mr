/**
 * بيانات واستعلامات إدارة المستخدمين
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_MESSAGING } from '@/lib/queryStaleTime';
import { useAuth } from '@/hooks/auth/useAuthContext';

export interface ManagedUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
}

export const callAdminApi = async (body: Record<string, unknown>) => {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("يجب تسجيل الدخول أولاً");
  const res = await supabase.functions.invoke('admin-manage-users', { body });
  if (res.error) throw new Error(res.error.message);
  if (res.data?.error) throw new Error(res.data.error);
  return res.data;
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
    // #19: enabled مشروط + #38: إصلاح email.eq. الفارغة
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
    // #19: enabled مشروط
    enabled: enabled && !!currentUser,
  });
};
