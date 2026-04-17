/**
 * هوك لصفحة عرض العقود للمستفيد — يستخرج كل المنطق من الصفحة
 */
import { useMemo, useCallback, useState, useEffect } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { useContractsSafeByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { usePropertiesMap } from '@/hooks/data/properties/usePropertiesMap';
import { defaultNotify } from '@/lib/notify';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

export const useContractsViewPage = () => {
  const { fiscalYearId } = useFiscalYear();
  const { data: contracts, isLoading, isError, refetch } = useContractsSafeByFiscalYear(fiscalYearId);
  const [currentPage, setCurrentPage] = useState(1);

  const propertyIds = useMemo(() => {
    if (!contracts) return [];
    return [...new Set(contracts.map(c => c.property_id).filter(Boolean))] as string[];
  }, [contracts]);

  const { data: propertiesMap = {} } = usePropertiesMap(propertyIds);
  const pdfWaqfInfo = usePdfWaqfInfo();

  const now = useMemo(() => new Date(), []);
  const in90Days = useMemo(() => new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000), [now]);

  const isExpiringSoon = useCallback(
    (c: { status: string | null; end_date: string | null }) =>
      c.status === 'active' && !!c.end_date && new Date(c.end_date) <= in90Days,
    [in90Days],
  );

  const stats = useMemo(() => {
    if (!contracts) return { total: 0, active: 0, expired: 0, totalRent: 0, expiringSoon: 0, activePercent: 0, activeRent: 0 };
    const active = contracts.filter(c => c.status === 'active');
    const totalRent = contracts.reduce((sum, c) => sum + (c.rent_amount || 0), 0);
    const activeRent = active.reduce((sum, c) => sum + (c.rent_amount || 0), 0);
    const activePercent = contracts.length > 0 ? Math.round((active.length / contracts.length) * 100) : 0;
    return {
      total: contracts.length, active: active.length, activePercent, activeRent,
      expired: contracts.filter(c => c.status === 'expired').length,
      totalRent, expiringSoon: active.filter(c => isExpiringSoon(c)).length,
    };
  }, [contracts, isExpiringSoon]);

  const paginatedContracts = useMemo(() => {
    if (!contracts) return [];
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return contracts.slice(start, start + ITEMS_PER_PAGE);
  }, [contracts, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [fiscalYearId]);

  const handleExportPdf = useCallback(async () => {
    try {
      const { generateContractsPDF } = await import('@/utils/pdf');
      await generateContractsPDF(
        (contracts ?? []).map(c => ({
          contract_number: c.contract_number ?? '', tenant_name: c.tenant_name ?? '',
          start_date: c.start_date ?? '', end_date: c.end_date ?? '',
          rent_amount: c.rent_amount ?? 0, status: c.status ?? '',
        })),
        pdfWaqfInfo
      );
      defaultNotify.success('تم تصدير العقود بنجاح');
    } catch {
      defaultNotify.error('حدث خطأ أثناء تصدير PDF');
    }
  }, [contracts, pdfWaqfInfo]);

  return {
    contracts, isLoading, isError, refetch,
    currentPage, setCurrentPage,
    propertiesMap, isExpiringSoon, stats,
    paginatedContracts, handleExportPdf,
    totalItems: contracts?.length ?? 0,
    itemsPerPage: ITEMS_PER_PAGE,
  };
};
