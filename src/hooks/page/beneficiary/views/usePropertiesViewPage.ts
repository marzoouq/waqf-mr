/**
 * هوك بيانات وملخصات صفحة عرض العقارات للمستفيد
 */
import { useMemo, useState, useCallback } from 'react';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractAllocationMap } from '@/hooks/domain/financial/useContractAllocationMap';
import { computePropertyFinancials, type PropertyFinancials } from '@/hooks/domain/financial/usePropertyFinancials';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/expenses/useExpenses';
import { useIncomeByFiscalYear } from '@/hooks/data/financial/income/useIncome';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAccountByFiscalYear } from '@/hooks/data/financial/accounts/useAccounts';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';
import { safeNumber } from '@/utils/format/safeNumber';
import { uiNotify } from '@/lib/notify';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';

export function usePropertiesViewPage() {
  // Realtime: انعكاس فوري لتعديلات العقارات والوحدات
  useDashboardRealtime(
    'properties-view-realtime',
    ['properties', 'units'],
    true,
  );

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
    // تطابق منطق الناظر (بند 9): الوحدات الشاغرة فقط — العقارات بدون وحدات لا تُحتسب ضمن "الشواغر"
    const vacantUnits = Math.max(0, totalUnits - occupiedUnits);
    const propertiesWithoutUnits = propertiesWithoutUnitsNoContract;
    const totalVacant = vacantUnits;
    // الإيرادات التعاقدية تُحسب من جدول allocations (DB) عبر الـ map الموحّد
    const contractualRevenue = (contracts ?? []).reduce((s, c) => {
      const alloc = allocationMap.get(c.id!);
      return s + (alloc ? alloc.allocated_amount : 0);
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
        return s + (alloc ? alloc.allocated_amount : 0);
      }, 0);
      // المصروفات الكاملة (موحّدة مع التقارير الرسمية)
      totalExpensesAll = (expenses ?? []).reduce((s, e) => s + safeNumber(e.amount), 0);
    }
    const netIncome = activeIncome - totalExpensesAll;
    // قاعدة الإشغال = الوحدات فقط (لا تُحسب العقارات بدون وحدات) — تطابق الناظر
    const overallOccupancy = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;
    const occColor = overallOccupancy >= 80 ? 'text-success' : overallOccupancy >= 50 ? 'text-warning' : 'text-destructive';
    const occBarColor = overallOccupancy >= 80 ? '[&>div]:bg-success' : overallOccupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';
    return { totalProperties, totalVacant, vacantUnits, propertiesWithoutUnits, contractualRevenue, activeIncome, totalExpensesAll, netIncome, overallOccupancy, occColor, occBarColor };
  }, [properties, totalUnits, occupiedUnits, propertiesWithoutUnitsNoContract, contracts, expenses, isClosed, accounts, isSpecificYear, allocationMap]);


  // --- حساب المؤشرات المالية لكل عقار (مرة واحدة) ---
  const propertyFinancialsMap = useMemo(() => {
    const map = new Map<string, PropertyFinancials>();
    for (const p of (properties ?? [])) {
      map.set(p.id, computePropertyFinancials({
        propertyId: p.id, contracts, expenses, units: units ?? [],
        isSpecificYear, allocationMap,
      }));
    }
    return map;
  }, [properties, contracts, expenses, units, isSpecificYear, allocationMap]);

  // --- #3/#61: خرائط مُسبقة الحساب لتفادي filter داخل .map JSX ---
  const propertyContractsMap = useMemo(() => {
    const map = new Map<string, typeof contracts>();
    for (const c of (contracts ?? [])) {
      if (!c.property_id) continue;
      const arr = map.get(c.property_id);
      if (arr) arr.push(c); else map.set(c.property_id, [c]);
    }
    return map;
  }, [contracts]);

  const propertyUnitsMap = useMemo(() => {
    const map = new Map<string, NonNullable<typeof units>>();
    for (const u of (units ?? [])) {
      const arr = map.get(u.property_id);
      if (arr) arr.push(u); else map.set(u.property_id, [u]);
    }
    return map;
  }, [units]);

  /**
   * عقارات مؤجرة كاملة (عقد بدون unit_id).
   * يراعي السنة المحددة: في عرض "كل السنوات" نقتصر على العقود النشطة لتجنّب إظهار عقار كمؤجَّر بعقد منتهٍ.
   */
  const wholePropertyRentedSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of (contracts ?? [])) {
      if (!(isSpecificYear || c.status === 'active')) continue;
      if (c.property_id && !c.unit_id) s.add(c.property_id);
    }
    return s;
  }, [contracts, isSpecificYear]);

  /** خريطة معرفات الوحدات المؤجرة لكل عقار */
  const rentedUnitIdsByPropertyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const [pid, pcontracts] of propertyContractsMap.entries()) {
      const set = new Set<string>();
      for (const c of pcontracts) if (c.unit_id) set.add(c.unit_id);
      map.set(pid, set);
    }
    return map;
  }, [propertyContractsMap]);

  const handleExportPdf = useCallback(async () => {
    try {
      const { generatePropertiesPDF } = await import('@/utils/pdf');
      await generatePropertiesPDF(
        (properties ?? []).map(p => ({
          property_number: p.property_number, property_type: p.property_type,
          location: p.location, area: p.area, description: p.description,
        })),
        pdfWaqfInfo,
      );
      uiNotify.success('تم تصدير العقارات بنجاح');
    } catch {
      uiNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [properties, pdfWaqfInfo]);

  return {
    properties, units, contracts, expenses, isLoading, isError,
    refetchProps, refetchUnits,
    isClosed, isSpecificYear, fiscalYearId,
    expandedId, setExpandedId,
    pdfWaqfInfo, allocationMap,
    totalUnits, occupiedUnits, rentedUnitIds, wholePropertyIds,
    summaryData,
    propertyFinancialsMap,
    propertyContractsMap,
    propertyUnitsMap,
    wholePropertyRentedSet,
    rentedUnitIdsByPropertyMap,
    handleExportPdf,
  };
}
