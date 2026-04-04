import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { STALE_FINANCIAL } from '@/lib/queryStaleTime';
import { useAuth } from '@/hooks/auth/useAuthContext';
import type { FiscalYear } from '@/types/database';

export type { FiscalYear };

export const useFiscalYears = () => {
  const { user, role, loading } = useAuth();
  return useQuery({
    queryKey: ['fiscal_years', user?.id],
    staleTime: STALE_FINANCIAL,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('id, label, start_date, end_date, status, published, created_at')
        .order('start_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as FiscalYear[];
    },
    // لا نبدأ الجلب حتى يكتمل المصادقة — يمنع قفل الـ Lock 5000ms
    enabled: !loading && !!user && !!role,
  });
};

export const useActiveFiscalYear = () => {
  const { data: fiscalYears = [], ...rest } = useFiscalYears();
  const active = fiscalYears.find((fy) => fy.status === 'active');

  useEffect(() => {
    if (!active && fiscalYears.length > 0) {
      logger.warn('No active fiscal year found, falling back to first available');
    }
  }, [active, fiscalYears.length]);

  return { data: active || fiscalYears[0] || null, fiscalYears, ...rest };
};
