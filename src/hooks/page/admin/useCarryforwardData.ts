/**
 * هوك بيانات صفحة تاريخ الترحيلات
 */
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useRetryQueries } from '@/hooks/ui/useRetryQueries';
import { useMyBeneficiaryProfile } from '@/hooks/data/beneficiaries/useMyBeneficiaryProfile';
import { usePublishedFiscalYears } from '@/hooks/data/content/usePublishedFiscalYears';
import { useMyBeneficiaryFinance } from '@/hooks/financial/useAdvanceRequests';
import { safeNumber } from '@/utils/format/safeNumber';

export const useCarryforwardData = () => {
  const { user } = useAuth();
  const handleRetry = useRetryQueries(['advance_carryforward', 'advance_requests', 'my-beneficiary']);

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
