/**
 * هوك ملخصات صفحة العقارات: summary + propertyOccupancy + propertyFinancialsMap
 * مُستخرَج من usePropertiesPage. الفصل بين 3 useMemos مقصود (راجع #25 في الفحص العميق).
 */
import { useMemo } from 'react';
import { computePropertyFinancials, type PropertyFinancials } from '@/hooks/financial/usePropertyFinancials';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/useExpenses';
import { useAccountByFiscalYear } from '@/hooks/data/financial/useAccounts';
import { useContractAllocationMap } from '@/hooks/financial/useContractAllocationMap';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import type { Property } from '@/types';
import type { Contract } from '@/types';

interface Args {
  properties: Property[];
  contracts: Contract[];
  propertiesLoading: boolean;
  contractsLoading: boolean;
}

export function usePropertiesSummary({ properties, contracts, propertiesLoading, contractsLoading }: Args) {
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();
  const isClosed = fiscalYear?.status === 'closed';

  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: accounts = [] } = useAccountByFiscalYear(fiscalYear?.label, fiscalYearId);

  const allocationMap = useContractAllocationMap(contracts);
  const summaryLoading = propertiesLoading || contractsLoading || unitsLoading || expensesLoading;

  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnitsCount = allUnits.length;
    const rentedUnitIds = new Set(contracts.filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id));
    const wholePropertyIds = new Set(contracts.filter(c => (isSpecificYear || c.status === 'active') && !c.unit_id).map(c => c.property_id));

    let totalRented = 0;
    let totalVacant = 0;
    properties.forEach(p => {
      const pUnits = allUnits.filter(u => u.property_id === p.id);
      if (pUnits.length > 0) {
        const r = pUnits.filter(u => rentedUnitIds.has(u.id)).length;
        totalRented += wholePropertyIds.has(p.id) ? pUnits.length : r;
        totalVacant += wholePropertyIds.has(p.id) ? 0 : pUnits.length - r;
      } else if (wholePropertyIds.has(p.id)) {
        totalRented += 1;
      } else {
        totalVacant += 1;
      }
    });

    const occupancyBase = totalRented + totalVacant;
    const overallOccupancy = occupancyBase > 0 ? Math.round((totalRented / occupancyBase) * 100) : 0;
    const contractualRevenue = contracts.reduce((s, c) => {
      const alloc = allocationMap.get(c.id);
      return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? Number(c.rent_amount) : 0));
    }, 0);

    const currentAccount = accounts?.[0];
    let activeIncome: number;
    let totalExpensesCalc: number;
    if (isClosed && currentAccount) {
      activeIncome = Number(currentAccount.total_income) || 0;
      totalExpensesCalc = Number(currentAccount.total_expenses) || 0;
    } else {
      activeIncome = contracts.filter(c => isSpecificYear || c.status === 'active').reduce((s, c) => {
        const alloc = allocationMap.get(c.id);
        return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? Number(c.rent_amount) : 0));
      }, 0);
      totalExpensesCalc = expenses.filter(e => e.property_id).reduce((s, e) => s + Number(e.amount), 0);
    }
    const netIncome = activeIncome - totalExpensesCalc;

    return { totalProperties, totalUnitsCount, totalRented, totalVacant, overallOccupancy, contractualRevenue, activeIncome, totalExpensesAll: totalExpensesCalc, netIncome, isClosed: !!isClosed };
  }, [properties, allUnits, contracts, expenses, isClosed, accounts, isSpecificYear, allocationMap]);

  const propertyOccupancy = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of properties) {
      const pUnits = allUnits.filter(u => u.property_id === p.id);
      const propContracts = contracts.filter(c => c.property_id === p.id);
      const rentedIds = new Set(propContracts.filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id));
      const hasWhole = propContracts.some(c => (isSpecificYear || c.status === 'active') && !c.unit_id);
      const total = pUnits.length;
      if (total > 0) {
        const rented = hasWhole && rentedIds.size === 0 ? total : pUnits.filter(u => rentedIds.has(u.id)).length;
        map.set(p.id, Math.round((rented / total) * 100));
      } else {
        map.set(p.id, hasWhole ? 100 : 0);
      }
    }
    return map;
  }, [properties, allUnits, contracts, isSpecificYear]);

  const propertyFinancialsMap = useMemo(() => {
    const map = new Map<string, PropertyFinancials>();
    for (const p of properties) {
      map.set(p.id, computePropertyFinancials({
        propertyId: p.id, contracts, expenses, units: allUnits,
        isSpecificYear, allocationMap,
      }));
    }
    return map;
  }, [properties, contracts, expenses, allUnits, isSpecificYear, allocationMap]);

  return {
    summaryLoading, summary,
    propertyOccupancy, propertyFinancialsMap,
    isSpecificYear,
  };
}
