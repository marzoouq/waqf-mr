/**
 * هوك صفحة العقارات — orchestrator نحيف يجمع 3 hooks فرعية:
 *   - usePropertiesFilters (search/type/occupancy + pagination)
 *   - usePropertiesForm (create/edit/delete + dialog state)
 *   - usePropertiesSummary (summary + occupancy + financials maps)
 *
 * يحافظ على نفس public API للحفاظ على PropertiesPage.tsx بدون تغيير.
 */
import { useState } from 'react';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import type { Property } from '@/types/database';
import { usePropertiesFilters } from '../properties/usePropertiesFilters';
import { usePropertiesForm } from '../properties/usePropertiesForm';
import { usePropertiesSummary } from '../properties/usePropertiesSummary';

export function usePropertiesPage() {
  const propertiesQuery = useProperties();
  const { data: properties = [], isLoading } = propertiesQuery;
  const { fiscalYearId } = useFiscalYear();
  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);

  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const summary = usePropertiesSummary({ properties, contracts, propertiesLoading: isLoading, contractsLoading });
  const filters = usePropertiesFilters({ properties, propertyOccupancy: summary.propertyOccupancy });
  const form = usePropertiesForm();

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
  };
}
