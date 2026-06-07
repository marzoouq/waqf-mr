/**
 * هوك صفحة العقارات — orchestrator نحيف يجمع 3 hooks فرعية:
 *   - usePropertiesFilters (search/type/occupancy + pagination)
 *   - usePropertiesForm (create/edit/delete + dialog state)
 *   - usePropertiesSummary (summary + occupancy + financials maps)
 *
 * يحافظ على نفس public API للحفاظ على PropertiesPage.tsx بدون تغيير.
 */
import { useEffect, useRef, useState } from 'react';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useDashboardRealtime } from '@/hooks/data/core/useDashboardRealtime';
import { logger } from '@/lib/logger';
import type { Property } from '@/types';
import { usePropertiesFilters } from '../properties/usePropertiesFilters';
import { usePropertiesForm } from '../properties/usePropertiesForm';
import { usePropertiesSummary } from '../properties/usePropertiesSummary';
import { usePdfWaqfInfo } from '@/hooks/data/settings/waqf/usePdfWaqfInfo';

export function usePropertiesPage() {
  // Realtime: انعكاس فوري لتعديلات العقارات/الوحدات/العقود على بطاقات الإشغال
  useDashboardRealtime(
    'admin-properties-realtime',
    ['properties', 'units', 'contracts', 'contract_fiscal_allocations'],
    true,
  );

  const propertiesQuery = useProperties();
  const { data: properties = [], isLoading } = propertiesQuery;
  const { fiscalYearId } = useFiscalYear();
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  // تسجيل تشخيصي لأخطاء/تعافي استعلام العقارات — يساعد على تتبع الأعطال
  // مثل "The provided callback is no longer runnable" بدون إزعاج المستخدم.
  const lastErrorRef = useRef<unknown>(null);
  useEffect(() => {
    if (propertiesQuery.error && propertiesQuery.error !== lastErrorRef.current) {
      lastErrorRef.current = propertiesQuery.error;
      logger.error('[PropertiesPage] فشل تحميل العقارات', {
        page: propertiesQuery.page,
        pageSize: propertiesQuery.pageSize,
        propertiesCount: properties.length,
        contractsCount: contracts.length,
        message: (propertiesQuery.error as Error)?.message,
      });
    } else if (!propertiesQuery.error && lastErrorRef.current && propertiesQuery.isSuccess) {
      logger.info('[PropertiesPage] تعافي بعد فشل سابق', {
        propertiesCount: properties.length,
      });
      lastErrorRef.current = null;
    }
  }, [propertiesQuery.error, propertiesQuery.isSuccess, propertiesQuery.page, propertiesQuery.pageSize, properties.length, contracts.length]);


  const summary = usePropertiesSummary({ properties, contracts, propertiesLoading: isLoading, contractsLoading });
  const filters = usePropertiesFilters({ properties, propertyOccupancy: summary.propertyOccupancy });
  const form = usePropertiesForm();
  const pdfWaqfInfo = usePdfWaqfInfo();

  return {
    // بيانات
    properties, isLoading, contracts,
    isSpecificYear: summary.isSpecificYear,
    summaryLoading: summary.summaryLoading,
    summary: summary.summary,
    propertyFinancialsMap: summary.propertyFinancialsMap,
    // النموذج
    isOpen: form.isOpen, setIsOpen: form.setIsOpen,
    editingProperty: form.editingProperty,
    formData: form.formData, setFormData: form.setFormData,
    resetForm: form.resetForm, handleEdit: form.handleEdit, handleSubmit: form.handleSubmit,
    createPending: form.createPending, updatePending: form.updatePending,
    deleteTarget: form.deleteTarget, setDeleteTarget: form.setDeleteTarget,
    handleConfirmDelete: form.handleConfirmDelete,
    // الفلاتر
    searchQuery: filters.searchQuery, setSearchQuery: filters.setSearchQuery,
    typeFilter: filters.typeFilter, setTypeFilter: filters.setTypeFilter,
    occupancyFilter: filters.occupancyFilter, setOccupancyFilter: filters.setOccupancyFilter,
    uniqueTypes: filters.uniqueTypes,
    currentPage: filters.currentPage, setCurrentPage: filters.setCurrentPage,
    ITEMS_PER_PAGE: filters.ITEMS_PER_PAGE,
    filteredProperties: filters.filteredProperties,
    // server-side pagination (من useCrudFactory)
    serverPage: propertiesQuery.page,
    serverNextPage: propertiesQuery.nextPage,
    serverPrevPage: propertiesQuery.prevPage,
    serverHasNextPage: propertiesQuery.hasNextPage,
    serverHasPrevPage: propertiesQuery.hasPrevPage,
    serverPageSize: propertiesQuery.pageSize,
    // عقار مختار
    selectedProperty, setSelectedProperty,
    // PDF
    pdfWaqfInfo,
  };
}
