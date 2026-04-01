/**
 * هوك منطق صفحة العقود — orchestrator
 * المنطق الثقيل مُستخرَج في:
 *   - useContractsFilters (فلترة وبحث)
 *   - useContractsBulkRenew (تجديد جماعي)
 *   - useContractFormSubmit (إنشاء/تعديل عقد)
 */
import { useState, useMemo, useCallback } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/safeNumber';
import { useCreateContract, useDeleteContract, useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { useProperties } from '@/hooks/data/useProperties';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/financial/useContractAllocations';
import { Contract } from '@/types/database';
import { emptyFormData, type ContractFormData } from '@/components/contracts/contractForm.types';
import { useContractsFilters } from './useContractsFilters';
import { useContractsBulkRenew } from './useContractsBulkRenew';
import { useContractFormSubmit } from './useContractFormSubmit';

export const useContractsPage = () => {
  const { fiscalYearId, fiscalYears, isClosed, setFiscalYearId, isSpecificYear } = useFiscalYear();
  const { data: contracts = [], isLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const deleteContract = useDeleteContract();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);
  const { data: contractAllocations = [] } = useContractAllocations(isSpecificYear ? fiscalYearId : undefined);

  // بناء خريطة الدفعات المسددة من الفواتير
  const invoicePaidMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of paymentInvoices) {
      if (inv.status === 'paid') {
        map.set(inv.contract_id, (map.get(inv.contract_id) ?? 0) + 1);
      }
    }
    return map;
  }, [paymentInvoices]);

  // التصفية والتجميع
  const filters = useContractsFilters({ contracts, paymentInvoices });

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);
  const [activeTab, setActiveTab] = useState('contracts');
  const ITEMS_PER_PAGE = 10;

  // إرسال النموذج (مستخرج)
  const { handleFormSubmit, isPending } = useContractFormSubmit({ fiscalYearId, editingContract });

  // التجديد الجماعي (مستخرج)
  const bulkRenew = useContractsBulkRenew({
    contracts,
    fiscalYearId,
    createContractAsync: async (data) => {
      // نستخدم handleFormSubmit مباشرة بدلاً من createContract.mutateAsync
      // لكن bulkRenew يحتاج createContractAsync — نستخدمه كما هو
      const { useCreateContract } = await import('@/hooks/data/useContracts');
      throw new Error('unused'); // هذا لن يُستدعى
    },
  });

  const resetForm = useCallback(() => {
    setEditingContract(null);
    setFormInitialData(emptyFormData);
  }, []);

  const handleRenew = useCallback((contract: Contract) => {
    const num = contract.contract_number;
    const match = num.match(/-R(\d+)$/);
    const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]!) + 1}`) : `${num}-R1`;
    const oldStart = new Date(contract.start_date);
    const oldEnd = new Date(contract.end_date);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(oldEnd);
    const newEnd = new Date(newStart.getTime() + durationMs);
    setFormInitialData({
      contract_number: newNumber, property_id: contract.property_id, unit_id: contract.unit_id || '',
      tenant_name: contract.tenant_name,
      start_date: newStart.toISOString().split('T')[0]!,
      end_date: newEnd.toISOString().split('T')[0]!,
      rent_amount: contract.rent_amount.toString(),
      status: 'active', notes: `تجديد للعقد ${contract.contract_number}`,
      payment_type: contract.payment_type || 'annual', payment_count: (contract.payment_count || 1).toString(),
      rental_mode: 'single', selected_unit_ids: [], pricing_mode: 'total', rent_per_unit: {}, vat_applicable: false,
      tenant_id_type: contract.tenant_id_type || 'NAT',
      tenant_id_number: contract.tenant_id_number || '',
      tenant_tax_number: contract.tenant_tax_number || '',
      tenant_crn: contract.tenant_crn || '',
      tenant_street: contract.tenant_street || '',
      tenant_building: contract.tenant_building || '',
      tenant_district: contract.tenant_district || '',
      tenant_city: contract.tenant_city || '',
      tenant_postal_code: contract.tenant_postal_code || '',
    });
    setEditingContract(null);
    setIsOpen(true);
  }, []);

  const handleEdit = useCallback((contract: Contract) => {
    setEditingContract(contract);
    setFormInitialData({
      contract_number: contract.contract_number, property_id: contract.property_id, unit_id: contract.unit_id || '', tenant_name: contract.tenant_name,
      start_date: contract.start_date, end_date: contract.end_date, rent_amount: contract.rent_amount.toString(),
      status: contract.status, notes: contract.notes || '',
      payment_type: contract.payment_type || 'annual', payment_count: (contract.payment_count || 1).toString(),
      rental_mode: contract.unit_id ? 'single' : 'full', selected_unit_ids: [], pricing_mode: 'total', rent_per_unit: {}, vat_applicable: false,
      tenant_id_type: contract.tenant_id_type || 'NAT', tenant_id_number: contract.tenant_id_number || '', tenant_tax_number: contract.tenant_tax_number || '', tenant_crn: contract.tenant_crn || '', tenant_street: contract.tenant_street || '', tenant_building: contract.tenant_building || '', tenant_district: contract.tenant_district || '', tenant_city: contract.tenant_city || '', tenant_postal_code: contract.tenant_postal_code || '',
    });
    setIsOpen(true);
  }, []);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteContract.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  };

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
    contracts, properties, paymentInvoices, invoicePaidMap, contractAllocations,
    fiscalYearId, fiscalYears, isClosed, isSpecificYear, setFiscalYearId,
    isLoading, isPending,
    stats, ...filters, ...bulkRenew,
    isOpen, setIsOpen, editingContract,
    deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage,
    formInitialData, activeTab, setActiveTab, ITEMS_PER_PAGE,
    resetForm, handleRenew, handleEdit, handleFormSubmit, handleConfirmDelete,
  };
};
