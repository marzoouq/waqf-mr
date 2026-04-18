/**
 * useContractsForPdf — جلب lazy للعقود لأغراض تصدير PDF فقط.
 *
 * مستخرج من `useMySharePage` للالتزام بـ v7 (لا يجوز استيراد supabase داخل page hooks).
 * يُعيد دالة async تأخذ `fiscalYearId` وتُرجع قائمة العقود المختصرة.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ContractForPdf {
  contract_number: string;
  tenant_name: string;
  rent_amount: number;
  status: string;
}

export function useContractsForPdf() {
  return useCallback(async (fiscalYearId?: string | null): Promise<ContractForPdf[]> => {
    let query = supabase
      .from('contracts')
      .select('contract_number, tenant_name, rent_amount, status')
      .order('created_at', { ascending: false });
    if (fiscalYearId && fiscalYearId !== 'all') {
      query = query.eq('fiscal_year_id', fiscalYearId);
    }
    const { data } = await query;
    return (data ?? []) as ContractForPdf[];
  }, []);
}
