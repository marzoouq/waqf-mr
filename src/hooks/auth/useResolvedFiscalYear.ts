/**
 * useResolvedFiscalYear — M1.2 (Version I-R)
 * يعزل منطق role-aware resolution للسنة المالية الحالية.
 *
 * يحدد:
 * - `noPublishedYears` (للمستفيد/الواقف فقط)
 * - `fiscalYearId` النهائي بعد resolveFiscalYearId
 * - كائن `fiscalYear` المطابق
 * - `isClosed`, `isSpecificYear`
 */
import { useMemo } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useActiveFiscalYear, type FiscalYear } from '@/hooks/data/financial/useFiscalYears';
import { isFyReady, isFyAll } from '@/constants/fiscalYearIds';
import { resolveFiscalYearId } from '@/utils/fiscalYear/resolveFiscalYearId';

export function useResolvedFiscalYear(selectedId: string) {
  const { data: activeFY, fiscalYears, isLoading } = useActiveFiscalYear();
  const { role, loading: authLoading } = useAuth();

  // المحاسب يُعامَل كأنه ليس "non-admin" — فقط المستفيد/الواقف مقيّدان بالمنشورة.
  const isNonAdmin = role === 'beneficiary' || role === 'waqif';

  const noPublishedYears =
    !isLoading && !authLoading && isNonAdmin && fiscalYears.length === 0;

  const fiscalYearId = resolveFiscalYearId({
    isLoading,
    authLoading,
    noPublishedYears,
    selectedId,
    activeFyId: activeFY?.id,
    isNonAdmin,
    firstYearId: fiscalYears[0]?.id,
  });

  const fiscalYear: FiscalYear | null = useMemo(
    () =>
      isFyAll(fiscalYearId) || !isFyReady(fiscalYearId)
        ? null
        : fiscalYears.find(fy => fy.id === fiscalYearId) || activeFY || null,
    [fiscalYears, fiscalYearId, activeFY],
  );

  const isClosed = fiscalYear?.status === 'closed';
  const isSpecificYear = !isFyAll(fiscalYearId) && isFyReady(fiscalYearId);

  return {
    fiscalYearId,
    fiscalYear,
    fiscalYears,
    isClosed,
    isLoading,
    noPublishedYears,
    isSpecificYear,
  };
}
