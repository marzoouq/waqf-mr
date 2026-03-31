/**
 * هوك مخصص لمنطق إدارة وحدات العقار
 * يُستخرج من PropertyUnitsDialog لفصل منطق الأعمال عن العرض
 */
import { useState } from 'react';
import { useUnits, UnitRow } from '@/hooks/data/useUnits';
import { useCreateUnit, useUpdateUnit, useDeleteUnit } from '@/hooks/data/useUnits';
import { useCreateContract, useUpdateContract } from '@/hooks/data/useContracts';
import { useTenantPayments } from '@/hooks/data/useTenantPayments';
import { usePaymentInvoices } from '@/hooks/data/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Property, Contract } from '@/types/database';
import { defaultNotify } from '@/hooks/data/mutationNotify';
import type { UnitFormData } from '@/components/properties/units/UnitFormCard';
import type { WholeRentalForm } from '@/components/properties/units/WholePropertyTab';

const getDefaultForm = (propertyId: string): UnitFormData => ({
  property_id: propertyId, unit_number: '', unit_type: 'شقة', floor: '', area: undefined, status: 'شاغرة', notes: '',
  tenant_name: '', rent_amount: '', payment_type: 'annual', payment_count: '1', contract_start_date: '', contract_end_date: '',
});

export function usePropertyUnits(property: Property, contracts: Contract[]) {
  const { data: units = [], isLoading } = useUnits(property.id);
  const { data: tenantPayments = [] } = useTenantPayments();
  const { fiscalYearId } = useFiscalYear();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);

  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const deleteUnit = useDeleteUnit();
  const createContract = useCreateContract();
  const updateContractMutation = useUpdateContract();

  const [rentalMode, setRentalMode] = useState<'units' | 'whole'>('units');
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

  const getPaymentInfo = (contractId: string) => {
    const payment = tenantPayments.find(p => p.contract_id === contractId);
    return payment ? payment.paid_months : 0;
  };

  const wholePropertyContracts = contracts.filter(c => c.property_id === property.id && !c.unit_id).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
  });
  const wholePropertyContract = wholePropertyContracts[0] || null;

  const handleWholePropertySave = async (form: WholeRentalForm) => {
    if (!form.tenant_name || !form.rent_amount || !form.start_date || !form.end_date) {
      defaultNotify.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    const rentAmount = parseFloat(form.rent_amount);
    const paymentCount = form.payment_type === 'monthly' ? 12 : form.payment_type === 'multi' ? parseInt(form.payment_count || '1') : 1;
    const paymentAmount = rentAmount / paymentCount;

    if (wholePropertyContract) {
      await updateContractMutation.mutateAsync({
        id: wholePropertyContract.id, tenant_name: form.tenant_name, rent_amount: rentAmount,
        payment_type: form.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
        start_date: form.start_date, end_date: form.end_date,
      });
    } else {
      await createContract.mutateAsync({
        contract_number: `C-${property.property_number}-WHOLE-${Date.now().toString(36)}`,
        property_id: property.id, tenant_name: form.tenant_name, rent_amount: rentAmount,
        start_date: form.start_date, end_date: form.end_date, status: 'active',
        payment_type: form.payment_type, payment_count: paymentCount, payment_amount: paymentAmount,
      });
    }
  };

  // إحصائيات الوحدات
  const rented = units.filter(u => u.status === 'مؤجرة').length;
  const vacant = units.filter(u => u.status === 'شاغرة').length;
  const maintenance = units.filter(u => u.status === 'صيانة').length;

  const isPending = createUnit.isPending || updateUnit.isPending || createContract.isPending || updateContractMutation.isPending;

  return {
    // بيانات
    units, isLoading, tenantPayments, paymentInvoices,
    wholePropertyContracts, wholePropertyContract,
    rented, vacant, maintenance,
    // حالة النموذج
    rentalMode, setRentalMode,
    isUnitFormOpen, setIsUnitFormOpen,
    editingUnit, unitForm, setUnitForm,
    deleteUnitTarget, setDeleteUnitTarget,
    // عمليات
    resetUnitForm, handleUnitSubmit, handleEditUnit,
    handleConfirmDeleteUnit, handleWholePropertySave, getPaymentInfo,
    isPending,
  };
}
