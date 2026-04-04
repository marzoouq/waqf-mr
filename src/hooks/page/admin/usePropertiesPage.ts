/**
 * هوك منطق صفحة العقارات — الحالة والفلترة والحسابات
 */
import { useState, useMemo } from 'react';
import { useProperties, useCreateProperty, useUpdateProperty, useDeleteProperty } from '@/hooks/data/properties/useProperties';
import { useAllUnits } from '@/hooks/data/properties/useUnits';
import { useExpensesByFiscalYear } from '@/hooks/data/financial/useExpenses';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAccountByFiscalYear } from '@/hooks/financial/useAccounts';
import { useContractAllocationMap } from '@/hooks/financial/useContractAllocationMap';
import { Property } from '@/types/database';
import { toast } from 'sonner';

export function usePropertiesPage() {
  const propertiesQuery = useProperties();
  const { data: properties = [], isLoading } = propertiesQuery;
  const { fiscalYearId, fiscalYear, isSpecificYear } = useFiscalYear();
  const isClosed = fiscalYear?.status === 'closed';

  const { data: contracts = [], isLoading: contractsLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: allUnits = [], isLoading: unitsLoading } = useAllUnits();
  const { data: expenses = [], isLoading: expensesLoading } = useExpensesByFiscalYear(fiscalYearId);
  // استعلام واحد بدلاً من useFinancialSummary (5 استعلامات) — نحتاج accounts فقط
  const { data: accounts = [] } = useAccountByFiscalYear(fiscalYear?.label, fiscalYearId);
  const createProperty = useCreateProperty();
  const updateProperty = useUpdateProperty();
  const deleteProperty = useDeleteProperty();

  const [isOpen, setIsOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [occupancyFilter, setOccupancyFilter] = useState<string>('all');
  const ITEMS_PER_PAGE = 9;
  const [formData, setFormData] = useState({
    property_number: '', property_type: '', location: '', area: '', description: '', vat_exempt: false,
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  const allocationMap = useContractAllocationMap(contracts);
  const summaryLoading = isLoading || contractsLoading || unitsLoading || expensesLoading;

  const summary = useMemo(() => {
    const totalProperties = properties.length;
    const totalUnitsCount = allUnits.length;
    const rentedUnitIds = new Set(contracts.filter(c => (isSpecificYear || c.status === 'active') && c.unit_id).map(c => c.unit_id));
    const wholePropertyIds = new Set(contracts.filter(c => (isSpecificYear || c.status === 'active') && !c.unit_id).map(c => c.property_id));

    let totalRented = 0;
    let totalVacant = 0;
    properties.forEach(p => {
      const pUnits = allUnits.filter(u => u.property_id === p.id);
      if (pUnits.length > 0) {
        const r = pUnits.filter(u => rentedUnitIds.has(u.id)).length;
        totalRented += wholePropertyIds.has(p.id) ? pUnits.length : r;
        totalVacant += wholePropertyIds.has(p.id) ? 0 : pUnits.length - r;
      } else if (wholePropertyIds.has(p.id)) {
        totalRented += 1;
      } else {
        totalVacant += 1;
      }
    });

    const occupancyBase = totalRented + totalVacant;
    const overallOccupancy = occupancyBase > 0 ? Math.round((totalRented / occupancyBase) * 100) : 0;
    const contractualRevenue = contracts.reduce((s, c) => {
      const alloc = allocationMap.get(c.id);
      return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? Number(c.rent_amount) : 0));
    }, 0);

    const currentAccount = accounts?.[0];
    let activeIncome: number;
    let totalExpensesCalc: number;
    if (isClosed && currentAccount) {
      activeIncome = Number(currentAccount.total_income) || 0;
      totalExpensesCalc = Number(currentAccount.total_expenses) || 0;
    } else {
      activeIncome = contracts.filter(c => isSpecificYear || c.status === 'active').reduce((s, c) => {
        const alloc = allocationMap.get(c.id);
        return s + (alloc ? alloc.allocated_amount : (allocationMap.size === 0 ? Number(c.rent_amount) : 0));
      }, 0);
      totalExpensesCalc = expenses.filter(e => e.property_id).reduce((s, e) => s + Number(e.amount), 0);
    }
    const netIncome = activeIncome - totalExpensesCalc;

    return { totalProperties, totalUnitsCount, totalRented, totalVacant, overallOccupancy, contractualRevenue, activeIncome, totalExpensesAll: totalExpensesCalc, netIncome, isClosed: !!isClosed };
  }, [properties, allUnits, contracts, expenses, isClosed, accounts, isSpecificYear, allocationMap]);

  const resetForm = () => {
    setFormData({ property_number: '', property_type: '', location: '', area: '', description: '', vat_exempt: false });
    setEditingProperty(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.property_number || !formData.property_type || !formData.location || !formData.area) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const propertyData = {
      property_number: formData.property_number, property_type: formData.property_type,
      location: formData.location, area: parseFloat(formData.area), description: formData.description || undefined,
      vat_exempt: formData.vat_exempt,
    };
    try {
      if (editingProperty) {
        await updateProperty.mutateAsync({ id: editingProperty.id, ...propertyData });
      } else {
        await createProperty.mutateAsync(propertyData);
      }
      setIsOpen(false);
      resetForm();
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const handleEdit = (property: Property, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProperty(property);
    setFormData({
      property_number: property.property_number, property_type: property.property_type,
      location: property.location, area: property.area.toString(), description: property.description || '',
      vat_exempt: property.vat_exempt ?? false,
    });
    setIsOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProperty.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  const uniqueTypes = useMemo(() => {
    const types = new Set(properties.map(p => p.property_type));
    return Array.from(types).sort();
  }, [properties]);

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

  const filteredProperties = properties.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.property_number.toLowerCase().includes(q) && !p.property_type.toLowerCase().includes(q) &&
        !p.location.toLowerCase().includes(q) && !(p.description || '').toLowerCase().includes(q)) return false;
    }
    if (typeFilter !== 'all' && p.property_type !== typeFilter) return false;
    if (occupancyFilter !== 'all') {
      const occ = propertyOccupancy.get(p.id) ?? 0;
      if (occupancyFilter === 'full' && occ < 100) return false;
      if (occupancyFilter === 'partial' && (occ <= 0 || occ >= 100)) return false;
      if (occupancyFilter === 'empty' && occ > 0) return false;
    }
    return true;
  });

  return {
    // بيانات
    properties, isLoading, contracts, allUnits, expenses, isSpecificYear,
    allocationMap, summaryLoading, summary,
    // حالة النموذج
    isOpen, setIsOpen, editingProperty, formData, setFormData,
    resetForm, handleEdit, handleSubmit,
    createPending: createProperty.isPending,
    updatePending: updateProperty.isPending,
    // حذف
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    // فلاتر
    searchQuery, setSearchQuery, typeFilter, setTypeFilter,
    occupancyFilter, setOccupancyFilter, uniqueTypes,
    // صفحات — client-side
    currentPage, setCurrentPage, ITEMS_PER_PAGE,
    // صفحات — server-side (من useCrudFactory)
    serverPage: propertiesQuery.page,
    serverNextPage: propertiesQuery.nextPage,
    serverPrevPage: propertiesQuery.prevPage,
    serverHasNextPage: propertiesQuery.hasNextPage,
    serverHasPrevPage: propertiesQuery.hasPrevPage,
    serverPageSize: propertiesQuery.pageSize,
    // عقار مختار
    selectedProperty, setSelectedProperty,
    // خصائص محسوبة
    filteredProperties,
  };
}
