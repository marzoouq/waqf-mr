/**
 * هوك CRUD نموذج العقد — منطق التحرير والتجديد والإنشاء
 * مُستخرج من useContractsPage لتقليل حجم الملف الأصلي (#29)
 */
import { useState, useCallback } from 'react';
import { Contract } from '@/types/database';
import { emptyFormData, type ContractFormData } from '@/components/contracts';
import { defaultNotify } from '@/lib/notify';
import { useCreateContract, useUpdateContract, useDeleteContract } from '@/hooks/data/contracts/useContracts';
import { getPaymentCount } from '@/utils/financial/contractHelpers';

interface UseContractFormParams {
  fiscalYearId: string;
  fiscalYears: Array<{ id: string; status: string }> | undefined;
}

export function useContractForm({ fiscalYearId, fiscalYears }: UseContractFormParams) {
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);

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
      defaultNotify.error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const paymentCount = getPaymentCount({ payment_type: formData.payment_type, payment_count: parseInt(formData.payment_count) || 1 });

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
      // CRUD factory — cast مطلوب لأنواع عامة من createCrudFactory
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
      defaultNotify.success(`تم إنشاء ${created} عقد للمستأجر ${formData.tenant_name}`);
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

  return {
    createContract, updateContract, deleteContract,
    isOpen, setIsOpen, editingContract,
    deleteTarget, setDeleteTarget,
    formInitialData,
    resetForm, handleRenew, handleEdit, handleFormSubmit, handleConfirmDelete,
    isPending: createContract.isPending || updateContract.isPending || deleteContract.isPending,
  };
}
