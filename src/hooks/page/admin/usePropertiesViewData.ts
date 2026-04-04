/**
 * هوك بيانات وملخصات صفحة عرض العقارات للمستفيد
 */
import { useMemo, useState } from 'react';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractAllocationMap } from '@/hooks/financial/useContractAllocationMap';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/useExpenses';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAccountByFiscalYear } from '@/hooks/financial/useAccounts';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { safeNumber } from '@/utils/format/safeNumber';

export function usePropertiesViewData() {
  const { data: properties, isLoading: propsLoading, isError: propsError, refetch: refetchProps } = useProperties();
  const { data: units, isLoading: unitsLoading, isError: unitsError, refetch: refetchUnits } = useAllUnits();
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();

  const isClosed = fiscalYear?.status === 'closed';
  const { data: contracts = [] } = useContractsSafeByFiscalYear(fiscalYearId);
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);
  const { data: accounts = [] } = useAccountByFiscalYear(fiscalYear?.label, fiscalYearId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const pdfWaqfInfo = usePdfWaqfInfo();
  const allocationMap = useContractAllocationMap(contracts);

  const isLoading = propsLoading || unitsLoading;
  const isError = propsError || unitsError;

  const totalUnits = units?.length ?? 0;

  const rentedUnitIds = new Set(
    (contracts ?? []).filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id)
  );
  const wholePropertyIds = new Set(
    (contracts ?? []).filter(c => (isSpecificYear || c.status === 'active') && c.property_id && !c.unit_id).map(c => c.property_id)
  );
  const occupiedUnits = units?.filter(u =>
    rentedUnitIds.has(u.id) || wholePropertyIds.has(u.property_id)
  ).length ?? 0;

  const propertiesWithoutUnitsNoContract = (properties ?? []).filter(p => {
    const pUnits = units?.filter(u => u.property_id === p.id) ?? [];
    return pUnits.length === 0 && !wholePropertyIds.has(p.id);
  }).length;

  const summaryData = useMemo(() => {
    const totalProperties = properties?.length ?? 0;
    const totalVacant = totalUnits - occupiedUnits + propertiesWithoutUnitsNoContract;
    const contractualRevenue = (contracts ?? []).reduce((s, c) => {
      const alloc = allocationMap.get(c.id!);
      return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? safeNumber(c.rent_amount) : 0));
    }, 0);

    const currentAccount = accounts?.[0];
    let activeIncome: number;
    let totalExpensesAll: number;
    if (isClosed && currentAccount) {
      activeIncome = safeNumber(currentAccount.total_income);
      totalExpensesAll = safeNumber(currentAccount.total_expenses);
    } else {
      const relevantContracts = isSpecificYear
        ? (contracts ?? [])
        : (contracts ?? []).filter(c => c.status === 'active');
      activeIncome = relevantContracts.reduce((s, c) => {
        const alloc = allocationMap.get(c.id!);
        return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? safeNumber(c.rent_amount) : 0));
      }, 0);
      const propExpensesAll = (expenses ?? []).filter(e => e.property_id);
      totalExpensesAll = propExpensesAll.reduce((s, e) => s + safeNumber(e.amount), 0);
    }
    const netIncome = activeIncome - totalExpensesAll;
    const overallOccupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const occColor = overallOccupancy >= 80 ? 'text-success' : overallOccupancy >= 50 ? 'text-warning' : 'text-destructive';
    const occBarColor = overallOccupancy >= 80 ? '[&>div]:bg-success' : overallOccupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';
    return { totalProperties, totalVacant, contractualRevenue, activeIncome, totalExpensesAll, netIncome, overallOccupancy, occColor, occBarColor };
  }, [properties, totalUnits, occupiedUnits, propertiesWithoutUnitsNoContract, contracts, expenses, isClosed, accounts, isSpecificYear, allocationMap]);

  return {
    properties, units, contracts, expenses, isLoading, isError,
    refetchProps, refetchUnits,
    isClosed, isSpecificYear, fiscalYearId,
    expandedId, setExpandedId,
    pdfWaqfInfo, allocationMap,
    totalUnits, occupiedUnits, rentedUnitIds, wholePropertyIds,
    summaryData,
  };
}
