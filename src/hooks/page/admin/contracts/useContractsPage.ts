/**
 * هوك إدارة صفحة العقود — orchestrator يجمع بين الهوكات الفرعية
 * تم استخراج CRUD form إلى useContractForm (#29)
 */
import { useState, useMemo } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/constants/pagination';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/format/safeNumber';
import { useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/data/financial/useContractAllocations';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { usePdfWaqfInfo } from '@/hooks/data/settings/usePdfWaqfInfo';
import { useContractsFilters } from './useContractsFilters';
import { useContractsBulkRenew } from './useContractsBulkRenew';
import { useContractForm } from './useContractForm';
import { asMutationArg } from '@/hooks/data/core';

const ITEMS_PER_PAGE = DEFAULT_PAGE_SIZE;

export const useContractsPage = () => {
  const { fiscalYearId, fiscalYears, isClosed, setFiscalYearId, isSpecificYear } = useFiscalYear();
  const { role } = useAuth();
  const isMobile = useIsMobile();
  const pdfWaqfInfo = usePdfWaqfInfo();
  const { data: contracts = [], isLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);
  const { data: contractAllocations = [] } = useContractAllocations(isSpecificYear ? fiscalYearId : undefined);

  // هوك CRUD النموذج — مُستخرج (#29)
  const form = useContractForm({ fiscalYearId, fiscalYears });

  // #A10 — دمج loops: بناء invoicePaidMap و overdueContractIds في loop واحدة
  const { invoicePaidMap, overdueContractIds } = useMemo(() => {
    const paidMap = new Map<string, number>();
    const overdueIds = new Set<string>();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 3600 * 1000;
    for (const inv of paymentInvoices) {
      if (inv.status === 'paid') {
        paidMap.set(inv.contract_id, (paidMap.get(inv.contract_id) ?? 0) + 1);
      }
      if (inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.due_date).getTime() + thirtyDays < now)) {
        overdueIds.add(inv.contract_id);
      }
    }
    return { invoicePaidMap: paidMap, overdueContractIds: overdueIds };
  }, [paymentInvoices]);

  // التصفية والتجميع
  const filters = useContractsFilters({ contracts, overdueContractIds });

  // التجديد الجماعي
  const bulkRenew = useContractsBulkRenew({
    contracts,
    fiscalYearId,
    // CRUD factory — استخدام asMutationArg (موجة 15)
    createContractAsync: (data) => form.createContract.mutateAsync(asMutationArg(form.createContract, data)),
  });

  // State
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('contracts');

  const stats = useMemo(() => {
    const active = contracts.filter(c => c.status === 'active');
    const expired = contracts.filter(c => c.status === 'expired');
    let totalRent: number;
    let activeRent: number;
    if (isSpecificYear && contractAllocations.length > 0) {
      const allocMap = new Map<string, number>();
      contractAllocations.forEach(a => {
        allocMap.set(a.contract_id, (allocMap.get(a.contract_id) ?? 0) + safeNumber(a.allocated_amount));
      });
      totalRent = contracts.reduce((sum, c) => sum + (allocMap.get(c.id) ?? 0), 0);
      activeRent = active.reduce((sum, c) => sum + (allocMap.get(c.id) ?? 0), 0);
    } else {
      totalRent = contracts.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);
      activeRent = active.reduce((sum, c) => sum + safeNumber(c.rent_amount), 0);
    }
    const now = new Date().getTime();
    const soon = active.filter(c => {
      const days = (new Date(c.end_date).getTime() - now) / (1000 * 3600 * 24);
      return days > 0 && days <= EXPIRING_SOON_DAYS;
    });
    const activePercent = contracts.length > 0 ? Math.round((active.length / contracts.length) * 100) : 0;
    return { total: contracts.length, active: active.length, activePercent, expired: expired.length, totalRent, activeRent, expiringSoon: soon.length };
  }, [contracts, contractAllocations, isSpecificYear]);

  return {
    // Data
    contracts, properties, paymentInvoices, invoicePaidMap, contractAllocations,
    fiscalYearId, fiscalYears, isClosed, isSpecificYear, setFiscalYearId,
    isLoading, isPending: form.isPending,
    // Side-effect hooks (موجة 17 — نُقلت من ContractsPage)
    role, isMobile, pdfWaqfInfo,
    // Computed
    stats,
    ...filters,
    ...bulkRenew,
    // Form — من useContractForm
    isOpen: form.isOpen, setIsOpen: form.setIsOpen, editingContract: form.editingContract,
    deleteTarget: form.deleteTarget, setDeleteTarget: form.setDeleteTarget,
    formInitialData: form.formInitialData,
    resetForm: form.resetForm, handleRenew: form.handleRenew, handleEdit: form.handleEdit,
    handleFormSubmit: form.handleFormSubmit, handleConfirmDelete: form.handleConfirmDelete,
    // Pagination
    currentPage, setCurrentPage,
    activeTab, setActiveTab, ITEMS_PER_PAGE,
  };
};
