import { useState, useMemo, useCallback } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/format/safeNumber';
import { useCreateContract, useUpdateContract, useDeleteContract, useContractsByFiscalYear } from '@/hooks/data/contracts/useContracts';
import { useProperties } from '@/hooks/data/properties/useProperties';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/data/financial/useContractAllocations';
import { Contract } from '@/types/database';
import { emptyFormData, type ContractFormData } from '@/components/contracts';
import { toast } from 'sonner';
import { useContractsFilters } from './useContractsFilters';
import { useContractsBulkRenew } from './useContractsBulkRenew';

export const useContractsPage = () => {
  const { fiscalYearId, fiscalYears, isClosed, setFiscalYearId, isSpecificYear } = useFiscalYear();
  const { data: contracts = [], isLoading } = useContractsByFiscalYear(fiscalYearId);
  const { data: properties = [] } = useProperties();
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
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

  // التجديد الجماعي
  const bulkRenew = useContractsBulkRenew({
    contracts,
    fiscalYearId,
    createContractAsync: (data) => createContract.mutateAsync(data as unknown as Parameters<typeof createContract.mutateAsync>[0]),
  });

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);
  const [activeTab, setActiveTab] = useState('contracts');
  const ITEMS_PER_PAGE = 10;

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

  const handleFormSubmit = async (formData: ContractFormData, isEditing: boolean) => {
    if (formData.end_date <= formData.start_date) {
      toast.error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const paymentCount = formData.payment_type === 'monthly' ? 12 : formData.payment_type === 'quarterly' ? 4 : formData.payment_type === 'semi_annual' ? 2 : (formData.payment_type === 'annual' ? 1 : parseInt(formData.payment_count) || 1);

    if (isEditing && editingContract) {
      const rentAmount = parseFloat(formData.rent_amount);
      const paymentAmount = rentAmount / paymentCount;
      const contractData: Record<string, unknown> = {
        contract_number: formData.contract_number, property_id: formData.property_id, unit_id: formData.unit_id || null, tenant_name: formData.tenant_name,
        start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
        status: formData.status, notes: formData.notes || undefined,
        payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        tenant_id_type: formData.tenant_id_type || 'NAT', tenant_id_number: formData.tenant_id_number || null,
        tenant_tax_number: formData.tenant_tax_number || null, tenant_crn: formData.tenant_crn || null,
        tenant_street: formData.tenant_street || null, tenant_building: formData.tenant_building || null,
        tenant_district: formData.tenant_district || null, tenant_city: formData.tenant_city || null, tenant_postal_code: formData.tenant_postal_code || null,
      };
      await updateContract.mutateAsync({ id: editingContract.id, ...contractData } as unknown as Parameters<typeof updateContract.mutateAsync>[0]);
      return;
    }

    const contextFYId = fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : null;
    let activeFYId = contextFYId;
    if (!activeFYId) {
      const activeFY = fiscalYears?.find(fy => fy.status === 'active');
      activeFYId = activeFY?.id || null;
    }
    const activeFY = activeFYId ? { id: activeFYId } : null;
    const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (formData.rental_mode === 'multi' && formData.selected_unit_ids.length > 1) {
      const units = formData.selected_unit_ids;
      let created = 0;
      for (let i = 0; i < units.length; i++) {
        const unitId = units[i]!;
        const contractNumber = `${formData.contract_number}-${suffixLetters[i] || (i + 1)}`;
        let rentAmount: number;
        if (formData.pricing_mode === 'per_unit') {
          rentAmount = parseFloat(formData.rent_per_unit[unitId] ?? '0') || 0;
        } else {
          rentAmount = parseFloat(formData.rent_amount) / units.length;
        }
        const paymentAmount = rentAmount / paymentCount;
        const contractData: Record<string, unknown> = {
          contract_number: contractNumber, property_id: formData.property_id, unit_id: unitId, tenant_name: formData.tenant_name,
          start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
          status: formData.status, notes: formData.notes || undefined,
          payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
          fiscal_year_id: activeFY?.id || null,
          tenant_id_type: formData.tenant_id_type || 'NAT', tenant_id_number: formData.tenant_id_number || null,
          tenant_tax_number: formData.tenant_tax_number || null, tenant_crn: formData.tenant_crn || null,
          tenant_street: formData.tenant_street || null, tenant_building: formData.tenant_building || null,
          tenant_district: formData.tenant_district || null, tenant_city: formData.tenant_city || null, tenant_postal_code: formData.tenant_postal_code || null,
        };
        await createContract.mutateAsync(contractData as unknown as Parameters<typeof createContract.mutateAsync>[0]);
        created++;
      }
      toast.success(`تم إنشاء ${created} عقد للمستأجر ${formData.tenant_name}`);
    } else {
      const rentAmount = parseFloat(formData.rent_amount);
      const paymentAmount = rentAmount / paymentCount;
      const contractData: Record<string, unknown> = {
        contract_number: formData.contract_number, property_id: formData.property_id,
        unit_id: (formData.rental_mode === 'single' ? formData.unit_id : (formData.rental_mode === 'multi' && formData.selected_unit_ids.length === 1 ? formData.selected_unit_ids[0] : null)) || null,
        tenant_name: formData.tenant_name,
        start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount,
        status: formData.status, notes: formData.notes || undefined,
        payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        tenant_id_type: formData.tenant_id_type || 'NAT', tenant_id_number: formData.tenant_id_number || null,
        tenant_tax_number: formData.tenant_tax_number || null, tenant_crn: formData.tenant_crn || null,
        tenant_street: formData.tenant_street || null, tenant_building: formData.tenant_building || null,
        tenant_district: formData.tenant_district || null, tenant_city: formData.tenant_city || null, tenant_postal_code: formData.tenant_postal_code || null,
      };
      if (activeFY?.id) contractData.fiscal_year_id = activeFY.id;
      await createContract.mutateAsync(contractData as unknown as Parameters<typeof createContract.mutateAsync>[0]);
    }
  };

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
    // Data
    contracts, properties, paymentInvoices, invoicePaidMap, contractAllocations,
    fiscalYearId, fiscalYears, isClosed, isSpecificYear, setFiscalYearId,
    isLoading, isPending: createContract.isPending || updateContract.isPending,
    // Computed
    stats,
    ...filters,
    ...bulkRenew,
    // State
    isOpen, setIsOpen, editingContract,
    deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage,
    formInitialData,
    activeTab, setActiveTab, ITEMS_PER_PAGE,
    // Actions
    resetForm, handleRenew, handleEdit, handleFormSubmit, handleConfirmDelete,
  };
};
