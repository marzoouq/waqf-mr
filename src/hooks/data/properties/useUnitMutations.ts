/**
 * هوك فرعي لعمليات CRUD على الوحدات وإنشاء/تحديث العقود المرتبطة
 */
import { useState } from 'react';
import { UnitRow } from './useUnits';
import { useCreateUnit, useUpdateUnit, useDeleteUnit } from './useUnits';
import { useCreateContract, useUpdateContract } from '@/hooks/data/contracts/useContracts';
import { Property, Contract } from '@/types/database';
import { defaultNotify } from '@/lib/notify';
import type { UnitFormData } from '@/components/properties/units/UnitFormCard';

const getDefaultForm = (propertyId: string): UnitFormData => ({
  property_id: propertyId, unit_number: '', unit_type: 'شقة', floor: '', area: undefined, status: 'شاغرة', notes: '',
  tenant_name: '', rent_amount: '', payment_type: 'annual', payment_count: '1', contract_start_date: '', contract_end_date: '',
});

export function useUnitMutations(property: Property, contracts: Contract[]) {
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const createContract = useCreateContract();
  const updateContractMutation = useUpdateContract();

  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<UnitRow | null>(null);
  const [deleteUnitTarget, setDeleteUnitTarget] = useState<UnitRow | null>(null);
  const [unitForm, setUnitForm] = useState<UnitFormData>(getDefaultForm(property.id));

  const resetUnitForm = () => {
    setUnitForm(getDefaultForm(property.id));
    setEditingUnit(null);
    setIsUnitFormOpen(false);
  };

  const handleUnitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitForm.unit_number) {
      defaultNotify.error('يرجى إدخال رقم الوحدة');
      return;
    }

    let savedUnitId: string | undefined;

    if (editingUnit) {
      await updateUnit.mutateAsync({
        id: editingUnit.id,
        unit_number: unitForm.unit_number, unit_type: unitForm.unit_type,
        floor: unitForm.floor || null, area: unitForm.area ?? null,
        status: unitForm.status, notes: unitForm.notes || null,
      });
      savedUnitId = editingUnit.id;
    } else {
      const result = await createUnit.mutateAsync({
        property_id: unitForm.property_id, unit_number: unitForm.unit_number,
        unit_type: unitForm.unit_type, floor: unitForm.floor || '',
        area: unitForm.area, status: unitForm.status, notes: unitForm.notes || '',
      });
      savedUnitId = result?.id;
    }

    // إنشاء أو تحديث العقد إذا كانت الوحدة مؤجرة
    if (unitForm.status === 'مؤجرة' && unitForm.tenant_name && unitForm.rent_amount && savedUnitId) {
      const rentAmount = parseFloat(unitForm.rent_amount);
      const paymentCount = unitForm.payment_type === 'monthly' ? 12 : unitForm.payment_type === 'multi' ? parseInt(unitForm.payment_count || '1') : 1;
      const paymentAmount = rentAmount / paymentCount;
      const existingContract = contracts.find(c => c.unit_id === savedUnitId && c.status === 'active');

      if (existingContract) {
        await updateContractMutation.mutateAsync({
          id: existingContract.id, tenant_name: unitForm.tenant_name, rent_amount: rentAmount,
          payment_type: unitForm.payment_type || 'annual', payment_count: paymentCount, payment_amount: paymentAmount,
          start_date: unitForm.contract_start_date || existingContract.start_date,
          end_date: unitForm.contract_end_date || existingContract.end_date,
        });
      } else {
        if (!unitForm.contract_start_date || !unitForm.contract_end_date) {
          defaultNotify.error('يرجى تحديد تاريخ بداية ونهاية العقد');
          return;
        }
        await createContract.mutateAsync({
          contract_number: `C-${property.property_number}-${unitForm.unit_number}-${Date.now().toString(36)}`,
          property_id: property.id, unit_id: savedUnitId, tenant_name: unitForm.tenant_name,
          rent_amount: rentAmount, start_date: unitForm.contract_start_date, end_date: unitForm.contract_end_date,
          status: 'active', payment_type: unitForm.payment_type || 'annual',
          payment_count: paymentCount, payment_amount: paymentAmount,
        });
      }
    }

    resetUnitForm();
  };

  const handleEditUnit = (unit: UnitRow) => {
    const existingContract = contracts.find(c => c.unit_id === unit.id && c.status === 'active');
    setEditingUnit(unit);
    setUnitForm({
      property_id: property.id, unit_number: unit.unit_number, unit_type: unit.unit_type,
      floor: unit.floor || '', area: unit.area ?? undefined, status: unit.status, notes: unit.notes || '',
      tenant_name: existingContract?.tenant_name || '', rent_amount: existingContract?.rent_amount?.toString() || '',
      payment_type: existingContract?.payment_type || 'annual', payment_count: existingContract?.payment_count?.toString() || '1',
      contract_start_date: existingContract?.start_date || '', contract_end_date: existingContract?.end_date || '',
    });
    setIsUnitFormOpen(true);
  };

  const handleConfirmDeleteUnit = async () => {
    if (!deleteUnitTarget) return;
    await deleteUnit.mutateAsync({ id: deleteUnitTarget.id, propertyId: property.id });
    setDeleteUnitTarget(null);
  };

  const isPending = createUnit.isPending || updateUnit.isPending || createContract.isPending || updateContractMutation.isPending;

  return {
    isUnitFormOpen, setIsUnitFormOpen,
    editingUnit, unitForm, setUnitForm,
    deleteUnitTarget, setDeleteUnitTarget,
    resetUnitForm, handleUnitSubmit, handleEditUnit, handleConfirmDeleteUnit,
    isPending,
  };
}
