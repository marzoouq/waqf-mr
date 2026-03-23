import { useState, useMemo, useCallback } from 'react';
import { EXPIRING_SOON_DAYS } from '@/constants';
import { safeNumber } from '@/utils/safeNumber';
import { useCreateContract, useUpdateContract, useDeleteContract, useContractsByFiscalYear } from '@/hooks/data/useContracts';
import { useProperties } from '@/hooks/data/useProperties';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useContractAllocations } from '@/hooks/financial/useContractAllocations';
import { Contract } from '@/types/database';
import { emptyFormData, type ContractFormData } from '@/components/contracts/contractForm.types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getPaymentTypeLabel } from '@/utils/contractHelpers';

const getBaseNumber = (num: string) => num.replace(/-R\d+$/, '');

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

  // State
  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkRenewOpen, setBulkRenewOpen] = useState(false);
  const [bulkRenewing, setBulkRenewing] = useState(false);
  const [selectedForRenewal, setSelectedForRenewal] = useState<Set<string>>(new Set());
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'overdue'>('all');
  const [propertyFilter, setPropertyFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('contracts');
  const ITEMS_PER_PAGE = 10;

  const resetForm = useCallback(() => {
    setEditingContract(null);
    setFormInitialData(emptyFormData);
  }, []);

  const handleRenew = useCallback((contract: Contract) => {
    const num = contract.contract_number;
    const match = num.match(/-R(\d+)$/);
    const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]) + 1}`) : `${num}-R1`;
    // حساب تواريخ مقترحة بناءً على مدة العقد الأصلي
    const oldStart = new Date(contract.start_date);
    const oldEnd = new Date(contract.end_date);
    const durationMs = oldEnd.getTime() - oldStart.getTime();
    const newStart = new Date(oldEnd);
    const newEnd = new Date(newStart.getTime() + durationMs);
    setFormInitialData({
      contract_number: newNumber, property_id: contract.property_id, unit_id: contract.unit_id || '',
      tenant_name: contract.tenant_name,
      start_date: newStart.toISOString().split('T')[0],
      end_date: newEnd.toISOString().split('T')[0],
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
      const { data: activeFY } = await supabase.from('fiscal_years').select('id').eq('status', 'active').limit(1).maybeSingle();
      activeFYId = activeFY?.id || null;
    }
    const activeFY = activeFYId ? { id: activeFYId } : null;
    const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (formData.rental_mode === 'multi' && formData.selected_unit_ids.length > 1) {
      const units = formData.selected_unit_ids;
      let created = 0;
      for (let i = 0; i < units.length; i++) {
        const unitId = units[i];
        const contractNumber = `${formData.contract_number}-${suffixLetters[i] || (i + 1)}`;
        let rentAmount: number;
        if (formData.pricing_mode === 'per_unit') {
          rentAmount = parseFloat(formData.rent_per_unit[unitId]) || 0;
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

  const expiredContracts = useMemo(() => contracts.filter(c => c.status === 'expired'), [contracts]);

  const toggleSelection = useCallback((id: string) => {
    setSelectedForRenewal(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const selectAllExpired = useCallback(() => setSelectedForRenewal(new Set(expiredContracts.map(c => c.id))), [expiredContracts]);
  const deselectAll = useCallback(() => setSelectedForRenewal(new Set()), []);

  const handleBulkRenew = async () => {
    setBulkRenewing(true);
    try {
      const { data: activeFY } = await supabase.from('fiscal_years').select('id').eq('status', 'active').limit(1).maybeSingle();
      const contractsToRenew = expiredContracts.filter(c => selectedForRenewal.has(c.id));
      let created = 0;
      for (const contract of contractsToRenew) {
        const oldStart = new Date(contract.start_date);
        const oldEnd = new Date(contract.end_date);
        const durationMs = oldEnd.getTime() - oldStart.getTime();
        const newStart = new Date(oldEnd);
        const newEnd = new Date(newStart.getTime() + durationMs);
        const startDate = newStart.toISOString().split('T')[0];
        const endDate = newEnd.toISOString().split('T')[0];
        const num = contract.contract_number;
        const match = num.match(/-R(\d+)$/);
        const newNumber = match ? num.replace(/-R(\d+)$/, `-R${parseInt(match[1]) + 1}`) : `${num}-R1`;
        const paymentCount = contract.payment_type === 'monthly' ? 12 : contract.payment_type === 'quarterly' ? 4 : contract.payment_type === 'semi_annual' ? 2 : (contract.payment_type === 'annual' ? 1 : (contract.payment_count || 1));
        const paymentAmount = safeNumber(contract.rent_amount) / paymentCount;
        const newContract: Record<string, unknown> = {
          contract_number: newNumber, property_id: contract.property_id, unit_id: contract.unit_id || null,
          tenant_name: contract.tenant_name, start_date: startDate, end_date: endDate,
          rent_amount: contract.rent_amount, status: 'active',
          notes: `تجديد جماعي للعقد ${contract.contract_number}`,
          payment_type: contract.payment_type || 'annual', payment_count: paymentCount, payment_amount: paymentAmount,
          fiscal_year_id: activeFY?.id || null,
          tenant_id_type: contract.tenant_id_type || 'NAT',
          tenant_id_number: contract.tenant_id_number || null,
          tenant_tax_number: contract.tenant_tax_number || null,
          tenant_crn: contract.tenant_crn || null,
          tenant_street: contract.tenant_street || null,
          tenant_building: contract.tenant_building || null,
          tenant_district: contract.tenant_district || null,
          tenant_city: contract.tenant_city || null,
          tenant_postal_code: contract.tenant_postal_code || null,
        };
        await createContract.mutateAsync(newContract as unknown as Parameters<typeof createContract.mutateAsync>[0]);
        created++;
      }
      await supabase.rpc('notify_admins', { p_title: 'تجديد جماعي للعقود', p_message: `تم تجديد ${created} عقد منتهي بنجاح`, p_type: 'success', p_link: '/dashboard/contracts' });
      await supabase.rpc('notify_all_beneficiaries', { p_title: 'تجديد عقود الإيجار', p_message: `تم تجديد ${created} عقد إيجار للسنة الجديدة`, p_type: 'info', p_link: '/beneficiary/notifications' });
      toast.success(`تم تجديد ${created} عقد بنجاح`);
    } catch {
      toast.error('حدث خطأ أثناء التجديد');
    } finally {
      setBulkRenewing(false);
      setBulkRenewOpen(false);
      setSelectedForRenewal(new Set());
    }
  };

  // تجميع العقود حسب الرقم الأساسي
  const groupedContracts = useMemo(() => {
    const map = new Map<string, Contract[]>();
    for (const c of contracts) {
      const base = getBaseNumber(c.contract_number);
      if (!map.has(base)) map.set(base, []);
      map.get(base)!.push(c);
    }
    for (const [, group] of map) {
      group.sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime());
    }
    return [...map.entries()].sort((a, b) => {
      const latestA = new Date(a[1][0].start_date).getTime();
      const latestB = new Date(b[1][0].start_date).getTime();
      return latestB - latestA;
    });
  }, [contracts]);

  // العقود المتأخرة عن السداد > 30 يوم
  const overdueContractIds = useMemo(() => {
    const ids = new Set<string>();
    const now = Date.now();
    const thirtyDays = 30 * 24 * 3600 * 1000;
    for (const inv of paymentInvoices) {
      if (inv.status === 'overdue' || (inv.status === 'pending' && new Date(inv.due_date).getTime() + thirtyDays < now)) {
        ids.add(inv.contract_id);
      }
    }
    return ids;
  }, [paymentInvoices]);

  const statusCounts = useMemo(() => {
    let active = 0, expired = 0;
    for (const [, group] of groupedContracts) {
      const latestStatus = group[0].status;
      if (latestStatus === 'active') active++;
      else expired++;
    }
    const overdue = groupedContracts.filter(([, group]) => group.some(c => overdueContractIds.has(c.id))).length;
    return { active, expired, all: groupedContracts.length, overdue };
  }, [groupedContracts, overdueContractIds]);

  // فلترة المجموعات
  const filteredGroups = useMemo(() => {
    let result = groupedContracts;
    if (statusFilter === 'overdue') {
      result = result.filter(([, group]) => group.some(c => overdueContractIds.has(c.id)));
    } else if (statusFilter !== 'all') {
      result = result.filter(([, group]) => {
        const latestStatus = group[0].status;
        return statusFilter === 'active' ? latestStatus === 'active' : latestStatus !== 'active';
      });
    }
    if (propertyFilter !== 'all') {
      result = result.filter(([, group]) => group.some(c => c.property_id === propertyFilter));
    }
    if (paymentTypeFilter !== 'all') {
      result = result.filter(([, group]) => group.some(c => c.payment_type === paymentTypeFilter));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(([, group]) => group.some(c =>
        c.contract_number.toLowerCase().includes(q) || c.tenant_name.toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q) || getPaymentTypeLabel(c.payment_type).includes(q)
      ));
    }
    return result;
  }, [groupedContracts, searchQuery, statusFilter, propertyFilter, paymentTypeFilter, overdueContractIds]);

  const allExpanded = filteredGroups.length > 0 && expandedGroups.size >= filteredGroups.length;
  const toggleAllGroups = useCallback(() => {
    if (allExpanded) {
      setExpandedGroups(new Set());
    } else {
      setExpandedGroups(new Set(filteredGroups.map(([base]) => base)));
    }
  }, [allExpanded, filteredGroups]);

  const expiredIds = useMemo(() => new Set(expiredContracts.map(c => c.id)), [expiredContracts]);

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
    stats, expiredContracts, expiredIds, groupedContracts, filteredGroups, statusCounts, overdueContractIds, allExpanded,
    // State
    isOpen, setIsOpen, editingContract, searchQuery, setSearchQuery, deleteTarget, setDeleteTarget,
    currentPage, setCurrentPage, bulkRenewOpen, setBulkRenewOpen, bulkRenewing,
    selectedForRenewal, formInitialData, expandedGroups, setExpandedGroups,
    statusFilter, setStatusFilter, propertyFilter, setPropertyFilter,
    paymentTypeFilter, setPaymentTypeFilter, activeTab, setActiveTab, ITEMS_PER_PAGE,
    // Actions
    resetForm, handleRenew, handleEdit, handleFormSubmit, handleConfirmDelete,
    handleBulkRenew, toggleSelection, selectAllExpired, deselectAll, toggleAllGroups,
  };
};
