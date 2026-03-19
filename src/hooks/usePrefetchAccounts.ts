/**
 * هوك تحميل مسبق لبيانات صفحة الحسابات عند تمرير الماوس
 * يُستخدم في روابط Sidebar لتسريع التنقل
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePrefetchAccounts() {
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    // تحميل مسبق للحسابات
    queryClient.prefetchQuery({
      queryKey: ['accounts'],
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('accounts')
          .select('*')
          .order('fiscal_year', { ascending: false })
          .limit(100);
        if (error) throw error;
        return data;
      },
    });

    // تحميل مسبق للمستفيدين
    queryClient.prefetchQuery({
      queryKey: ['beneficiaries'],
      staleTime: 60_000,
      queryFn: async () => {
        const { data, error } = await supabase
          .from('beneficiaries_safe')
          .select('id, name, share_percentage, user_id, created_at, updated_at')
          .order('name');
        if (error) throw error;
        return data;
      },
    });
  }, [queryClient]);

  return prefetch;
}
