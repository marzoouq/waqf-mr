import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { FiscalYear } from '@/types/database';

export type { FiscalYear };

export const useFiscalYears = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['fiscal_years'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .order('start_date', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as FiscalYear[];
    },
    enabled: !!user,
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
