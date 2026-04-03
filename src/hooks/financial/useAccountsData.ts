/**
 * جلب البيانات الخام لصفحة الحسابات — لا حسابات، لا حالة UI
 */
import { useMemo } from 'react';
import { useAccounts } from '@/hooks/financial/useAccounts';
import { useIncomeByFiscalYear } from '@/hooks/data/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { useBeneficiaries } from '@/hooks/data/useBeneficiaries';
import { useTenantPayments } from '@/hooks/data/useTenantPayments';
import { useAllUnits } from '@/hooks/data/useUnits';
import { useProperties } from '@/hooks/data/useProperties';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocationMap } from '@/hooks/financial/useContractAllocationMap';
import { isFyAll } from '@/constants/fiscalYearIds';

export function useAccountsData() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: allContracts = [] } = useContractsByFiscalYear('all');
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: tenantPayments = [] } = useTenantPayments();
  const { data: allUnits = [] } = useAllUnits();
  const { data: properties = [] } = useProperties();
  const appSettings = useAppSettings();

  const { fiscalYearId, fiscalYear: selectedFY, fiscalYears, isClosed } = useFiscalYear();

  // تخصيصات العقود — مصدر واحد للحقيقة
  const allocationMap = useContractAllocationMap(allContracts);

  // تصفية العقود حسب السنة المالية (مع استبعاد الملغاة)
  const contracts = useMemo(() => {
    const activeContracts = allContracts.filter(c => c.status !== 'cancelled');
    if (!fiscalYearId || isFyAll(fiscalYearId)) return activeContracts;
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
