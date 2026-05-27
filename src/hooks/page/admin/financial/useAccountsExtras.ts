/**
 * يجمع بيانات إقفال السنة (الفواتير غير المدفوعة، السلف المعلّقة،
 * إجمالي نسب المستفيدين، وتقسيم المتأخرات) في hook واحد.
 * مستخرج من useAccountsPage لتقليل حجمه.
 */
import { useMemo } from 'react';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useAdvanceRequests } from '@/hooks/data/financial/useAdvanceRequests';
import { useTotalBeneficiaryPercentage } from '@/hooks/data/financial/useTotalBeneficiaryPercentage';
import { useOverdueSplit } from './useOverdueSplit';

export const useAccountsExtras = (
  fiscalYearId: string | undefined,
  fiscalYearStartDate: string | null,
) => {
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId || 'all');
  const { data: advanceRequests = [] } = useAdvanceRequests(
    fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : undefined,
  );
  const { data: totalBenPct = 0 } = useTotalBeneficiaryPercentage();

  const unpaidInvoices = useMemo(
    () => paymentInvoices.filter(inv => inv.status === 'pending' || inv.status === 'overdue').length,
    [paymentInvoices],
  );
  const pendingAdvances = useMemo(
    () => advanceRequests.filter(r => r.status === 'pending').length,
    [advanceRequests],
  );

  const overdueSplit = useOverdueSplit(paymentInvoices, fiscalYearStartDate);

  return { paymentInvoices, advanceRequests, totalBenPct, unpaidInvoices, pendingAdvances, overdueSplit };
};
