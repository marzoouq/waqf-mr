/**
 * هوك mutation لإقفال السنة المالية عبر RPC
 * مستخرج من useAccountsActions لفصل طبقة البيانات عن منطق الصفحة
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { defaultNotify } from '@/lib/notify';

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
      const { data: result, error } = await supabase.rpc('close_fiscal_year', {
        p_fiscal_year_id: fiscalYearId,
        p_account_data: JSON.parse(JSON.stringify(accountData)),
        p_waqf_corpus_manual: waqfCorpusManual,
      });
      if (error) throw error;
      return result as CloseYearResult | null;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment_invoices'] });
    },
    onError: (err) => {
      logger.error('خطأ في إقفال السنة:', err instanceof Error ? err.message : err);
      defaultNotify.error('فشل إقفال السنة المالية. يرجى المحاولة لاحقاً');
    },
  });
}
