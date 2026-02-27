import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FiscalYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'closed';
  published: boolean;
  created_at: string;
}

export const useFiscalYears = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['fiscal_years', user?.id ?? 'anon'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as FiscalYear[];
    },
    enabled: !!user,
  });
};

export const useActiveFiscalYear = () => {
  const { data: fiscalYears = [], ...rest } = useFiscalYears();
  const active = fiscalYears.find((fy) => fy.status === 'active') || fiscalYears[0] || null;
  return { data: active, fiscalYears, ...rest };
};
