/**
 * حسابات صفحة الحسابات — VAT، إيجارات، تحصيل، ملخصات مالية
 */
import { useMemo, useCallback } from 'react';
import { computeTotals, calculateFinancials, groupIncomeBySource, groupExpensesByType } from '@/utils/financial/accountsCalculations';
import type { useAccountsData } from './useAccountsData';

type AccountsData = ReturnType<typeof useAccountsData>;

/** حساب عدد الدفعات المتوقعة من نوع الدفع ومدة العقد بالأشهر */
const getPaymentCountFromMonths = (paymentType: string, months: number, paymentCount?: number | null): number => {
  if (paymentType === 'monthly') return months;
  if (paymentType === 'quarterly') return Math.max(1, Math.ceil(months / 3));
  if (paymentType === 'semi_annual' || paymentType === 'semi-annual') return Math.max(1, Math.ceil(months / 6));
  if (paymentType === 'annual') return Math.max(1, Math.ceil(months / 12));
  if (paymentType === 'multi') return paymentCount || 1;
  return 1;
};

/** تسمية حالة العقد — ثابتة لا تعتمد على state */
const statusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'نشط';
    case 'expired': return 'منتهي';
    case 'cancelled': return 'ملغي';
    default: return status;
  }
};

interface CalcParams {
  data: AccountsData;
  adminPercent: number;
  waqifPercent: number;
  zakatAmount: number;
  waqfCorpusManual: number;
  waqfCorpusPrevious: number;
  manualVat: number;
  manualDistributions: number;
  /** هل السنة المالية مغلقة — يُمرر من المكوّن المستدعي */
  isClosed?: boolean;
}

export function useAccountsCalculations({
  data, adminPercent, waqifPercent, zakatAmount,
  waqfCorpusManual, waqfCorpusPrevious, manualVat, manualDistributions,
  isClosed = false,
}: CalcParams) {
  const { income, expenses, contracts, properties, allUnits, allocationMap, paymentMap, appSettings } = data;

  const { totalIncome, totalExpenses } = useMemo(
    () => computeTotals(income, expenses),
    [income, expenses]
  );

  const vatPercentage = Number(appSettings.data?.['vat_percentage'] || '15');
  const residentialVatExempt = (appSettings.data?.['residential_vat_exempt'] || 'true') === 'true';

  // خرائط بحث O(1) بدلاً من find() المكرر
  const propertyMap = useMemo(() => new Map(properties.map(p => [p.id, p])), [properties]);
  const unitMap = useMemo(() => new Map(allUnits.map(u => [u.id, u])), [allUnits]);

  const isCommercialContract = useCallback((contract: typeof contracts[0]) => {
    if (!residentialVatExempt) return true;
    const property = propertyMap.get(contract.property_id);
    if (property?.vat_exempt) return false;
    if (contract.unit_id) {
      const unit = unitMap.get(contract.unit_id);
      if (unit?.unit_type === 'محل') return true;
      if (unit?.unit_type === 'شقة') return false;
    }
    if (property?.property_type === 'تجاري') return true;
    return false;
  }, [residentialVatExempt, propertyMap, unitMap]);

  const commercialRent = useMemo(() => contracts
    .filter(c => isCommercialContract(c))
    .reduce((sum, c) => {
      const allocation = allocationMap.get(c.id);
      return sum + (allocation ? allocation.allocated_amount : 0);
    }, 0), [contracts, isCommercialContract, allocationMap]);
  const calculatedVat = useMemo(() => commercialRent * (vatPercentage / 100), [commercialRent, vatPercentage]);

  const financials = useMemo(() => calculateFinancials({
    totalIncome, totalExpenses, waqfCorpusPrevious, manualVat,
    zakatAmount, adminPercent, waqifPercent,
    waqfCorpusManual, manualDistributions,
    isClosed,
  }), [totalIncome, totalExpenses, waqfCorpusPrevious, manualVat, zakatAmount, adminPercent, waqifPercent, waqfCorpusManual, manualDistributions, isClosed]);

  const incomeBySource = useMemo(() => groupIncomeBySource(income), [income]);
  const expensesByType = useMemo(() => groupExpensesByType(expenses), [expenses]);

  const totalAnnualRent = useMemo(() => contracts.reduce((sum, c) => {
    const allocation = allocationMap.get(c.id);
    return sum + (allocation ? allocation.allocated_amount : 0);
  }, 0), [contracts, allocationMap]);

  const getPaymentPerPeriod = useCallback((contract: typeof contracts[0]) => {
    // استخدام التخصيص عند توفره لضمان اتساق الدفعة مع expectedPayments
    const allocation = allocationMap.get(contract.id);
    if (allocation && allocation.allocated_payments > 0) {
      return allocation.allocated_amount / allocation.allocated_payments;
    }
    if (contract.payment_amount !== null && contract.payment_amount !== undefined) return Number(contract.payment_amount);
    const count = contract.payment_count || 1;
    return Number(contract.rent_amount) / count;
  }, [allocationMap]);

  // ⚠️ يختلف عن getPaymentCount — هذا يحسب من مدة العقد الفعلية
  // وليس القيم الثابتة (12/4/2/1) لأن العقد قد لا يغطي سنة كاملة
  const getExpectedPayments = useCallback((contract: typeof contracts[0]) => {
    const allocation = allocationMap.get(contract.id);
    if (allocation) return allocation.allocated_payments;
    const start = new Date(contract.start_date);
    const end = new Date(contract.end_date);
    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
    return getPaymentCountFromMonths(contract.payment_type, months, contract.payment_count);
  }, [allocationMap]);

  const totalPaymentPerPeriod = useMemo(() => contracts.reduce((sum, c) => sum + getPaymentPerPeriod(c), 0), [contracts, getPaymentPerPeriod]);

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
    const totalContractPayments = getPaymentCountFromMonths(contract.payment_type, totalMonths, contract.payment_count);

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
      status: expectedPayments === 0 ? 'لا يوجد استحقاق' : (arrears <= 0 ? 'مكتمل' : 'متأخر'),
      notes: paymentInfo?.notes || '',
      spansMultipleYears, totalContractPayments,
      allocatedToThisYear: expectedPayments, allocatedToOtherYears, allocationNote,
    };
  }), [contracts, paymentMap, getExpectedPayments, getPaymentPerPeriod, allocationMap]);

  const totalCollectedAll = collectionData.reduce((sum, d) => sum + d.totalCollected, 0);
  const totalArrearsAll = collectionData.reduce((sum, d) => sum + d.arrears, 0);
  const totalPaidMonths = collectionData.reduce((sum, d) => sum + d.paidMonths, 0);
  const totalExpectedPayments = collectionData.reduce((sum, d) => sum + d.expectedPayments, 0);

  const totalBeneficiaryPercentage = useMemo(() => data.beneficiaries.reduce((sum, b) => sum + Number(b.share_percentage), 0), [data.beneficiaries]);


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
