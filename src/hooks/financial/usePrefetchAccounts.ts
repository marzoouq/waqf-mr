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
          .select('id, fiscal_year, fiscal_year_id, total_income, total_expenses, net_after_expenses, vat_amount, net_after_vat, zakat_amount, admin_share, waqif_share, waqf_revenue, waqf_corpus_manual, waqf_corpus_previous, distributions_amount, created_at, updated_at')
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
