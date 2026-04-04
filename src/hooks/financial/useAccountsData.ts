/**
 * جلب البيانات الخام لصفحة الحسابات — لا حسابات، لا حالة UI
 * محسّن: يجلب العقود للسنة المحددة فقط + التخصيصات من جدول contract_fiscal_allocations مباشرة
 */
import { useMemo } from 'react';
import { useAccounts } from '@/hooks/financial/useAccounts';
import { useIncomeByFiscalYear } from '@/hooks/data/financial/useIncome';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useBeneficiaries } from '@/hooks/data/beneficiaries/useBeneficiaries';
import { useTenantPayments } from '@/hooks/data/contracts/useTenantPayments';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/financial/useContractAllocations';
import { isFyAll } from '@/constants/fiscalYearIds';

export function useAccountsData() {
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: beneficiaries = [] } = useBeneficiaries();
  const { data: tenantPayments = [] } = useTenantPayments();
  const { data: allUnits = [] } = useAllUnits();
  const { data: properties = [] } = useProperties();
  const appSettings = useAppSettings();

  const { fiscalYearId, fiscalYear: selectedFY, fiscalYears, isClosed } = useFiscalYear();

  // جلب العقود للسنة المحددة فقط (بدل كل العقود)
  const { data: contracts = [] } = useContractsByFiscalYear(fiscalYearId);

  // جلب التخصيصات من جدول contract_fiscal_allocations مباشرة
  const { data: allocations = [] } = useContractAllocations(fiscalYearId);

  // بناء allocationMap من التخصيصات المجلوبة
  const allocationMap = useMemo(() => {
    const map = new Map<string, { allocated_payments: number; allocated_amount: number }>();
    if (!fiscalYearId || isFyAll(fiscalYearId)) return map;
    for (const a of allocations) {
      map.set(a.contract_id, {
        allocated_payments: a.allocated_payments,
        allocated_amount: a.allocated_amount,
      });
    }
    return map;
  }, [allocations, fiscalYearId]);

  // جلب العقود ذات التخصيصات أيضاً (عقود من سنوات أخرى لكن لها تخصيص في السنة الحالية)
  const { data: allocatedContracts = [] } = useContractsByFiscalYear(
    // لا حاجة لجلب إضافي إذا كانت "كل السنوات" أو لا توجد تخصيصات
    allocations.length > 0 && !isFyAll(fiscalYearId) ? fiscalYearId : undefined,
  );

  // دمج العقود: العقود الأصلية + العقود ذات التخصيصات
  const mergedContracts = useMemo(() => {
    const activeContracts = contracts.filter(c => c.status !== 'cancelled');
    if (isFyAll(fiscalYearId) || allocations.length === 0) return activeContracts;

    // إضافة العقود التي لها تخصيصات ولكن ليست في القائمة الأصلية
    const contractIds = new Set(activeContracts.map(c => c.id));
    const extraContracts = allocatedContracts.filter(
      c => c.status !== 'cancelled' && !contractIds.has(c.id) && allocationMap.has(c.id)
    );
    return [...activeContracts, ...extraContracts];
  }, [contracts, allocatedContracts, fiscalYearId, allocationMap, allocations.length]);

  const { data: income = [] } = useIncomeByFiscalYear(fiscalYearId);
  const { data: expenses = [] } = useExpensesByFiscalYear(fiscalYearId);

  const paymentMap = useMemo(() => tenantPayments.reduce((acc, p) => {
    acc[p.contract_id] = p;
    return acc;
  }, {} as Record<string, typeof tenantPayments[0]>), [tenantPayments]);

  return {
    accounts, isLoading, allContracts: mergedContracts, contracts: mergedContracts, beneficiaries,
    tenantPayments, allUnits, properties, appSettings,
    income, expenses, allocationMap, paymentMap,
    selectedFY, fiscalYears, fiscalYearId, isClosed,
  };
}
