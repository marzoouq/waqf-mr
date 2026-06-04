/**
 * هوك mutation لإقفال السنة المالية عبر RPC
 * طبقة بيانات نقية: لا توستات هنا — `useAccountsActions` يلتقط الخطأ ويُظهر التوست.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { rpc } from '@/lib/api/rpc';

interface CloseYearInput {
  fiscalYearId: string;
  accountData: Record<string, unknown>;
  waqfCorpusManual: number;
}

interface CloseYearResult {
  closed_label?: string;
  next_label?: string;
  warnings?: string[];
}

export function useCloseFiscalYear() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ fiscalYearId, accountData, waqfCorpusManual }: CloseYearInput) => {
      const result = await rpc<CloseYearResult | null>('close_fiscal_year', {
        p_fiscal_year_id: fiscalYearId,
        p_account_data: JSON.parse(JSON.stringify(accountData)),
        p_waqf_corpus_manual: waqfCorpusManual,
      });
      return result;
    },
    onSuccess: () => {
      // قائمة شاملة: تشمل التوزيعات والسُلف والمرحّل والمستفيدين والفواتير ولوحات السنوات
      const keys = [
        'fiscal_years', 'accounts', 'income', 'expenses', 'contracts',
        'tenant_payments', 'payment_invoices', 'invoices', 'distributions',
        'advance_requests', 'advance_carryforward', 'beneficiaries',
        'dashboard_summary', 'annual_report_status', 'annual_report_items',
        'contract_fiscal_allocations',
      ];
      for (const key of keys) queryClient.invalidateQueries({ queryKey: [key] });
    },
  });
}
