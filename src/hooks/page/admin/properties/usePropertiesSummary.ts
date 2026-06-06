/**
 * هوك ملخصات صفحة العقارات: summary + propertyOccupancy + propertyFinancialsMap
 * مُستخرَج من usePropertiesPage. الفصل بين 3 useMemos مقصود (راجع #25 في الفحص العميق).
 */
import { useMemo } from 'react';
import { computePropertyFinancials, type PropertyFinancials } from '@/hooks/domain/financial/usePropertyFinancials';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useAccountByFiscalYear } from '@/hooks/data/financial/accounts/useAccounts';
import { useContractAllocationMap } from '@/hooks/domain/financial/useContractAllocationMap';
import { useContractAllocations } from '@/hooks/data/financial/contracts/useContractAllocations';
import { computeContractualRevenue } from '@/utils/financial/computeContractualRevenue';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { safeNumber } from '@/utils/format/safeNumber';
import { isFyAll } from '@/constants/fiscalYearIds';
import { computeOccupancySplit } from '@/utils/properties/computeOccupancySplit';
import type { Property } from '@/types';
import type { Contract } from '@/types';


interface Args {
  properties: Property[];
  contracts: Contract[];
  propertiesLoading: boolean;
  contractsLoading: boolean;
}

export function usePropertiesSummary({ properties, contracts, propertiesLoading, contractsLoading }: Args) {
  const { fiscalYearId, fiscalYear, isSpecificYear, isClosed } = useFiscalYear();

  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByFiscalYear(fiscalYearId);
  const { data: accounts = [] } = useAccountByFiscalYear(fiscalYear?.label, fiscalYearId);
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);

  const allocationMap = useContractAllocationMap(contracts);
  // مصدر موحّد للإيرادات التعاقدية — يطابق RPC ولا يستخدم fallback خطي
  const isSpecific = fiscalYearId && !isFyAll(fiscalYearId);
  const { data: allocations = [] } = useContractAllocations(isSpecific ? fiscalYearId : undefined);
  const summaryLoading = propertiesLoading || contractsLoading || unitsLoading || expensesLoading;

  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnitsCount = allUnits.length;

    // مصدر موحّد لتقسيم الإشغال (بند 9) — مغطّى بـ computeOccupancySplit.test.ts
    const split = computeOccupancySplit({
      properties: properties.map(p => ({ id: p.id })),
      units: allUnits.map(u => ({ id: u.id, property_id: u.property_id })),
      contracts: contracts.map(c => ({ unit_id: c.unit_id, property_id: c.property_id, status: c.status })),
      isSpecificYear,
    });
    const { totalRented, totalVacant, propertiesWithoutUnits, propertiesWithoutUnitsRented, overallOccupancy } = split;

    // الإيرادات التعاقدية (DB-backed) — يطابق ContractsPage و WaqifDashboard
    const contractualRevenue = computeContractualRevenue(contracts, allocations);

    const currentAccount = accounts?.[0];
    let activeIncome: number;
    let totalExpensesCalc: number;
    if (isClosed && currentAccount) {
      activeIncome = Number(currentAccount.total_income) || 0;
      totalExpensesCalc = Number(currentAccount.total_expenses) || 0;
    } else {
      const relevantContracts = contracts.filter(c => isSpecificYear || c.status === 'active');
      activeIncome = computeContractualRevenue(relevantContracts, allocations);
      // المصروفات الكاملة (بلا فلتر property_id) — لتوحيد المعنى مع التقارير
      totalExpensesCalc = expenses.reduce((s, e) => s + safeNumber(e.amount), 0);
    }

    // الإيراد المحصّل فعلياً = مجموع المدفوع من فواتير السنة المالية (المصدر الموحّد)
    const collectedIncome = paymentInvoices.reduce((s, inv) => {
      if (inv.status === 'paid' || inv.status === 'partially_paid') {
        return s + safeNumber(inv.paid_amount);
      }
      return s;
    }, 0);

    const netIncome = collectedIncome - totalExpensesCalc;

    return {
      totalProperties, totalUnitsCount, totalRented, totalVacant, overallOccupancy,
      propertiesWithoutUnits, propertiesWithoutUnitsRented,
      contractualRevenue, activeIncome, collectedIncome,
      totalExpensesAll: totalExpensesCalc, netIncome, isClosed: !!isClosed,
    };
  }, [properties, allUnits, contracts, expenses, isClosed, accounts, isSpecificYear, allocations, paymentInvoices]);


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
