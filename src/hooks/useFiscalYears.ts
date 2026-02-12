import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FiscalYear {
  id: string;
  label: string;
  start_date: string;
  end_date: string;
  status: 'active' | 'closed';
  created_at: string;
}

export const useFiscalYears = () => {
  return useQuery({
    queryKey: ['fiscal_years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscal_years')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data as FiscalYear[];
    },
  });
};

export const useActiveFiscalYear = () => {
  const { data: fiscalYears = [], ...rest } = useFiscalYears();
  const active = fiscalYears.find((fy) => fy.status === 'active') || fiscalYears[0] || null;
  return { data: active, fiscalYears, ...rest };
};
