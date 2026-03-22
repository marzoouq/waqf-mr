/**
 * حسابات صفحة الحسابات — VAT، إيجارات، تحصيل، ملخصات مالية
 */
import { useMemo, useCallback } from 'react';
import { computeTotals, calculateFinancials, groupIncomeBySource, groupExpensesByType } from '@/utils/accountsCalculations';
import type { useAccountsData } from './useAccountsData';

type AccountsData = ReturnType<typeof useAccountsData>;

interface CalcParams {
  data: AccountsData;
  adminPercent: number;
  waqifPercent: number;
  zakatAmount: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  manualVat: number;
  manualDistributions: number;
}

export function useAccountsCalculations({
  data, adminPercent, waqifPercent, zakatAmount,
  waqfCorpusManual, waqfCorpusPrevious, manualVat, manualDistributions,
}: CalcParams) {
  const { income, expenses, contracts, properties, allUnits, allocationMap, paymentMap, appSettings } = data;

  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses]
  );

  const vatPercentage = Number(appSettings.data?.['vat_percentage'] || '15');
  const residentialVatExempt = (appSettings.data?.['residential_vat_exempt'] || 'true') === 'true';

  const isCommercialContract = useCallback((contract: typeof contracts[0]) => {
    if (!residentialVatExempt) return true;
    const property = properties.find(p => p.id === contract.property_id);
    if (property?.vat_exempt) return false;
    if (contract.unit_id) {
      const unit = allUnits.find(u => u.id === contract.unit_id);
      if (unit?.unit_type === 'محل') return true;
      if (unit?.unit_type === 'شقة') return false;
    }
    if (property?.property_type === 'تجاري') return true;
    return false;
  }, [residentialVatExempt, properties, allUnits]);

  const commercialRent = contracts
    .filter(c => isCommercialContract(c))
    .reduce((sum, c) => {
      const allocation = allocationMap.get(c.id);
      return sum + (allocation ? allocation.allocated_amount : Number(c.rent_amount));
    }, 0);
  const calculatedVat = commercialRent * (vatPercentage / 100);

  const financials = useMemo(() => calculateFinancials({
    totalIncome, totalExpenses, waqfCorpusPrevious, manualVat,
    zakatAmount, adminPercent, waqifPercent,
    waqfCorpusManual, manualDistributions,
    isClosed: true,
  }), [totalIncome, totalExpenses, waqfCorpusPrevious, manualVat, zakatAmount, adminPercent, waqifPercent, waqfCorpusManual, manualDistributions]);

  const incomeBySource = useMemo(() => groupIncomeBySource(income), [income]);
  const expensesByType = useMemo(() => groupExpensesByType(expenses), [expenses]);

  const totalAnnualRent = contracts.reduce((sum, c) => {
    const allocation = allocationMap.get(c.id);
    return sum + (allocation ? allocation.allocated_amount : Number(c.rent_amount));
  }, 0);

  const getPaymentPerPeriod = useCallback((contract: typeof contracts[0]) => {
    if (contract.payment_amount != null) return Number(contract.payment_amount);
    const count = contract.payment_count || 1;
    return Number(contract.rent_amount) / count;
  }, []);

  const getExpectedPayments = useCallback((contract: typeof contracts[0]) => {
    const allocation = allocationMap.get(contract.id);
    if (allocation) return allocation.allocated_payments;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    if (contract.payment_type === 'monthly') return months;
    if (contract.payment_type === 'quarterly') return Math.max(1, Math.ceil(months / 3));
    if (contract.payment_type === 'semi_annual' || contract.payment_type === 'semi-annual') return Math.max(1, Math.ceil(months / 6));
    if (contract.payment_type === 'annual') return Math.max(1, Math.ceil(months / 12));
    if (contract.payment_type === 'multi') return contract.payment_count || 1;
    return 1;
  }, [allocationMap]);

  const totalPaymentPerPeriod = contracts.reduce((sum, c) => sum + getPaymentPerPeriod(c), 0);

  // بيانات التحصيل
  const collectionData = useMemo(() => contracts.map((contract, index) => {
    const paymentInfo = paymentMap[contract.id];
    const expectedPayments = getExpectedPayments(contract);
    const paidMonths = paymentInfo ? paymentInfo.paid_months : 0;
    const paymentPerPeriod = getPaymentPerPeriod(contract);
    const totalCollected = paymentPerPeriod * paidMonths;
    const arrears = paymentPerPeriod * expectedPayments - totalCollected;

    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const totalMonths = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    let totalContractPayments: number;
    if (contract.payment_type === 'monthly') totalContractPayments = totalMonths;
    else if (contract.payment_type === 'quarterly') totalContractPayments = Math.max(1, Math.ceil(totalMonths / 3));
    else if (contract.payment_type === 'semi_annual' || contract.payment_type === 'semi-annual') totalContractPayments = Math.max(1, Math.ceil(totalMonths / 6));
    else if (contract.payment_type === 'annual') totalContractPayments = Math.max(1, Math.ceil(totalMonths / 12));
    else if (contract.payment_type === 'multi') totalContractPayments = contract.payment_count || 1;
    else totalContractPayments = 1;

    const spansMultipleYears = allocationMap.has(contract.id) && expectedPayments < totalContractPayments;
    const allocatedToOtherYears = spansMultipleYears ? totalContractPayments - expectedPayments : 0;

    let allocationNote = '';
    if (spansMultipleYears) {
      allocationNote = `${expectedPayments} من ${totalContractPayments} دفعة في هذه السنة • ${allocatedToOtherYears} دفعات في سنة أخرى`;
    }

    return {
      index: index + 1,
      tenantName: contract.tenant_name,
      paymentPerPeriod, expectedPayments, paidMonths, totalCollected, arrears,
      status: arrears <= 0 ? 'مكتمل' : 'متأخر',
      notes: paymentInfo?.notes || '',
      spansMultipleYears, totalContractPayments,
      allocatedToThisYear: expectedPayments, allocatedToOtherYears, allocationNote,
    };
  }), [contracts, paymentMap, getExpectedPayments, getPaymentPerPeriod, allocationMap]);

  const totalCollectedAll = collectionData.reduce((sum, d) => sum + d.totalCollected, 0);
  const totalArrearsAll = collectionData.reduce((sum, d) => sum + d.arrears, 0);
  const totalPaidMonths = collectionData.reduce((sum, d) => sum + d.paidMonths, 0);
  const totalExpectedPayments = collectionData.reduce((sum, d) => sum + d.expectedPayments, 0);

  const totalBeneficiaryPercentage = data.beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0);

  const statusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'نشط';
      case 'expired': return 'منتهي';
      case 'cancelled': return 'ملغي';
      default: return status;
    }
  };

  return {
    totalIncome, totalExpenses, ...financials,
    incomeBySource, expensesByType,
    commercialRent, calculatedVat, vatPercentage,
    totalAnnualRent, totalPaymentPerPeriod,
    collectionData, totalCollectedAll, totalArrearsAll,
    totalPaidMonths, totalExpectedPayments,
    totalBeneficiaryPercentage,
    getPaymentPerPeriod, getExpectedPayments, statusLabel,
  };
}
