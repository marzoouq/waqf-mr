/**
 * جلب البيانات الخام لصفحة الحسابات — لا حسابات، لا حالة UI
 */
import { useMemo } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useIncomeByFiscalYear } from '@/hooks/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/useContracts';
import { useBeneficiaries } from '@/hooks/useBeneficiaries';
import { useTenantPayments } from '@/hooks/useTenantPayments';
import { useAllUnits } from '@/hooks/useUnits';
import { useProperties } from '@/hooks/useProperties';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { allocateContractToFiscalYears } from '@/utils/contractAllocation';

export function useAccountsData() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: allContracts = [] } = useContractsByFiscalYear('all');
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: tenantPayments = [] } = useTenantPayments();
  const { data: allUnits = [] } = useAllUnits();
  const { data: properties = [] } = useProperties();
  const appSettings = useAppSettings();

  const { fiscalYearId, fiscalYear: selectedFY, fiscalYears, isClosed } = useFiscalYear();

  // حساب تخصيصات العقود ديناميكياً
  const allocationMap = useMemo(() => {
    const map = new Map<string, { allocated_payments: number; allocated_amount: number }>();
    if (!fiscalYearId || fiscalYearId === 'all' || fiscalYears.length === 0) return map;
    for (const c of allContracts) {
      const allocs = allocateContractToFiscalYears(
        {
          id: c.id,
          start_date: c.start_date,
          end_date: c.end_date,
          rent_amount: Number(c.rent_amount),
          payment_type: c.payment_type,
          payment_count: c.payment_count,
          payment_amount: c.payment_amount != null ? Number(c.payment_amount) : undefined,
        },
        fiscalYears
      );
      const match = allocs.find(a => a.fiscal_year_id === fiscalYearId);
      if (match) {
        map.set(c.id, { allocated_payments: match.allocated_payments, allocated_amount: match.allocated_amount });
      }
    }
    return map;
  }, [allContracts, fiscalYearId, fiscalYears]);

  // تصفية العقود حسب السنة المالية (مع استبعاد الملغاة)
  const contracts = useMemo(() => {
    const activeContracts = allContracts.filter(c => c.status !== 'cancelled');
    if (!fiscalYearId || fiscalYearId === 'all') return activeContracts;
    return activeContracts.filter(c => c.fiscal_year_id === fiscalYearId || allocationMap.has(c.id));
  }, [allContracts, fiscalYearId, allocationMap]);

  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId);
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);

  const paymentMap = useMemo(() => tenantPayments.reduce((acc, p) => {
    acc[p.contract_id] = p;
    return acc;
  }, {} as Record<string, typeof tenantPayments[0]>), [tenantPayments]);

  return {
    accounts, isLoading, allContracts, contracts, beneficiaries,
    tenantPayments, allUnits, properties, appSettings,
    income, expenses, allocationMap, paymentMap,
    selectedFY, fiscalYears, fiscalYearId, isClosed,
  };
}
