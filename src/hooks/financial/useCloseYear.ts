/**
 * إقفال السنة المالية — مفصول من useAccountsActions
 */
import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { notifyAllBeneficiaries } from '@/utils/notifications';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import { logger } from '@/lib/logger';
import { fmt } from '@/utils/format';

interface CloseYearParams {
  selectedFY: { id: string; label: string; status: string } | null;
  buildAccountData: () => Record<string, unknown>;
  waqfCorpusManual: number;
}

export function useCloseYear({ selectedFY, buildAccountData, waqfCorpusManual }: CloseYearParams) {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const [closeYearOpen, setCloseYearOpen] = useState(false);
  const [isClosingYear, setIsClosingYear] = useState(false);

  const handleCloseYear = async () => {
    if (!selectedFY || selectedFY.status === 'closed') return;
    if (role !== 'admin') {
      defaultNotify.error('فقط الناظر يمكنه إقفال السنة المالية');
      return;
    }
    setIsClosingYear(true);
    try {
      const accountData = buildAccountData();
      const { data: result, error } = await supabase.rpc('close_fiscal_year', {
        p_fiscal_year_id: selectedFY.id,
        p_account_data: JSON.parse(JSON.stringify(accountData)),
        p_waqf_corpus_manual: waqfCorpusManual,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['fiscal_years'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['income'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['tenant_payments'] });
      queryClient.invalidateQueries({ queryKey: ['payment_invoices'] });

      notifyAllBeneficiaries(
        'إقفال السنة المالية',
        `تم إقفال السنة المالية ${selectedFY.label} وأرشفة جميع البيانات. تم ترحيل رقبة الوقف (${fmt(waqfCorpusManual)} ر.س) للسنة الجديدة.`,
        'info', '/beneficiary/accounts',
      );

      const rpcResult = result as { closed_label?: string; next_label?: string; warnings?: string[] } | null;
      if (rpcResult?.warnings && rpcResult.warnings.length > 0) {
        for (const w of rpcResult.warnings) {
          defaultNotify.warning(w, { duration: 10000 });
        }
      }
      defaultNotify.success(`تم إقفال السنة المالية ${rpcResult?.closed_label || selectedFY.label} وترحيل الرصيد بنجاح`);
      defaultNotify.info('تنبيه: السنة المالية الجديدة غير منشورة — يرجى نشرها من إعدادات السنوات المالية ليتمكن المستفيدون من رؤيتها', { duration: 8000 });
      setCloseYearOpen(false);
    } catch (err) {
      logger.error('خطأ في إقفال السنة:', err instanceof Error ? err.message : err);
      defaultNotify.error('خطأ في إقفال السنة المالية');
    } finally {
      setIsClosingYear(false);
    }
  };

  return { closeYearOpen, setCloseYearOpen, isClosingYear, handleCloseYear };
}
