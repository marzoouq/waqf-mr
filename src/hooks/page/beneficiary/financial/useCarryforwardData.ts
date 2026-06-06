/**
 * هوك بيانات صفحة تاريخ الترحيلات
 * H20: المصدر `useMyBeneficiaryFinance` يستخدم نفس RPC الأساسي للوحة المستفيد
 * عبر طبقة domain، لذا الأرقام متّسقة مع باقي الصفحات.
 */
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useRetryQueries } from '@/hooks/data/core/useRetryQueries';
import { useMyBeneficiaryProfile } from '@/hooks/data/beneficiaries/useMyBeneficiaryProfile';
import { usePublishedFiscalYears } from '@/hooks/data/content/usePublishedFiscalYears';
import { useMyBeneficiaryFinance } from '@/hooks/domain/financial/useAdvanceCalculations';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { safeNumber } from '@/utils/format/safeNumber';

export const useCarryforwardData = () => {
  const { user } = useAuth();
  const handleRetry = useRetryQueries(['advance_carryforward', 'advance_requests', 'my-beneficiary']);

  // N12: انعكاس فوري لتعديلات السلف والترحيلات
  useDashboardRealtime(
    'carryforward-history-realtime',
    ['advance_carryforward', 'advance_requests', 'distributions'],
    true,
  );

  const { data: beneficiary, isLoading: loadingBen, isError: benError } = useMyBeneficiaryProfile(user?.id);

  const { data: fiscalYears } = usePublishedFiscalYears();

  const fyLabel = (id: string | null) => {
    if (!id) return '—';
    return fiscalYears?.find(f => f.id === id)?.label ?? id;
  };

  const { data: benFinance, isLoading: loadingBenFin } = useMyBeneficiaryFinance(beneficiary?.id ?? undefined);
  const carryforwards = benFinance?.myCarryforwards ?? [];
  const advances = benFinance?.myAdvances ?? [];
  const activeBalance = benFinance?.carryforwardBalance ?? 0;

  const paidAdvances = advances.filter((a: { status: string }) => a.status === 'paid');
  const totalPaidAdvances = paidAdvances.reduce((s: number, a: { amount: number }) => s + safeNumber(a.amount), 0);
  const settledCF = carryforwards.filter((c: { status: string }) => c.status === 'settled');
  const totalSettled = settledCF.reduce((s: number, c: { amount: number }) => s + safeNumber(c.amount), 0);

  return {
    beneficiary,
    loadingBen,
    loadingBenFin,
    benError,
    handleRetry,
    carryforwards,
    paidAdvances,
    activeBalance,
    totalPaidAdvances,
    totalSettled,
    fyLabel,
  };
};
