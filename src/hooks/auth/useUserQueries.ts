/**
 * استعلامات إدارة المستخدمين — مفصولة من useUserManagement
 */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_SETTINGS, STALE_MESSAGING } from '@/lib/queryStaleTime';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { callAdminApi } from './useUserMutations';

export interface ManagedUser {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: string | null;
}

export function useUserQueries(
  currentPage: number,
  filters: { userSearch: string; roleFilter: string; statusFilterUser: string },
) {
  const { user: currentUser } = useAuth();

  const { data: registrationEnabled = false } = useQuery({
    queryKey: ['registration-enabled'],
    staleTime: STALE_SETTINGS,
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings').select('value').eq('key', 'registration_enabled').maybeSingle();
      return data?.value === 'true';
    },
  });

  const { data: usersResult = { users: [] as ManagedUser[], total: 0, nextPage: null as number | null }, isLoading, isError, error } = useQuery({
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
    retry: 2,
  });

  const allUsers = usersResult.users;
  const totalUsers = usersResult.total;
  const nextPage = usersResult.nextPage;

  const users = useMemo(() => {
    let result = allUsers;
    if (filters.userSearch) {
      const q = filters.userSearch.toLowerCase();
      result = result.filter(u => u.email.toLowerCase().includes(q));
    }
    if (filters.roleFilter !== 'all') {
      result = result.filter(u => (u.role || 'none') === filters.roleFilter);
    }
    if (filters.statusFilterUser === 'confirmed') {
      result = result.filter(u => !!u.email_confirmed_at);
    } else if (filters.statusFilterUser === 'unconfirmed') {
      result = result.filter(u => !u.email_confirmed_at);
    }
    return result;
  }, [allUsers, filters.userSearch, filters.roleFilter, filters.statusFilterUser]);

  const { data: orphanedBeneficiaries = [] } = useQuery({
    queryKey: ['orphaned-beneficiaries'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries').select('id, name, email, user_id')
        .or('email.is.null,email.eq.,user_id.is.null');
      return data || [];
    },
    enabled: !!currentUser,
  });

  const { data: unlinkedBeneficiaries = [] } = useQuery({
    queryKey: ['unlinked-beneficiaries'],
    staleTime: STALE_MESSAGING,
    queryFn: async () => {
      const { data } = await supabase
        .from('beneficiaries').select('id, name, user_id').is('user_id', null);
      return data || [];
    },
    enabled: !!currentUser,
  });

  const isSelf = (userId: string) => userId === currentUser?.id;

  return {
    users, totalUsers, nextPage, isLoading, isError, error,
    orphanedBeneficiaries, unlinkedBeneficiaries,
    registrationEnabled, isSelf,
  };
}
