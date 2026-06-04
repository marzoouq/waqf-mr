/**
 * هوك منسّق لإدارة وحدات العقار — يجمع بين الهوكات الفرعية
 */
import { useCallback, useState } from 'react';
import { useUnits } from '@/hooks/data/properties/useUnits';
import { useTenantPayments } from '@/hooks/data/contracts/useTenantPayments';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Property, Contract } from '@/types';
import { useUnitMutations } from './useUnitMutations';
import { useWholePropertyRental } from '@/hooks/data/contracts/useWholePropertyRental';
import type { WholeRentalForm } from '@/types/forms/property';
import { uiNotify } from '@/lib/notify';

export function usePropertyUnits(property: Property, contracts: Contract[]) {
  const { data: units = [], isLoading } = useUnits(property.id);
  const { data: tenantPayments = [] } = useTenantPayments();
  const { fiscalYearId } = useFiscalYear();
  const { data: paymentInvoices = [] } = usePaymentInvoices(fiscalYearId);

  const [rentalMode, setRentalMode] = useState<'units' | 'whole'>('units');

  const unitMutations = useUnitMutations(property, contracts);
  const wholeRental = useWholePropertyRental(property, contracts);

  // غلاف لإضافة Toasts (data layer نقي)
  const handleWholePropertySave = useCallback(async (form: WholeRentalForm): Promise<void> => {
    try {
      const result = await wholeRental.handleWholePropertySave(form);
      if (!result.ok) {
        if (result.reason === 'missing_fields') {
          uiNotify.error('يرجى ملء جميع الحقول المطلوبة');
        } else if (result.reason === 'no_fiscal_year') {
          uiNotify.error('لا توجد سنة مالية نشطة لربط العقد بها');
        }
      }
    } catch (err) {
      uiNotify.error(err instanceof Error ? err.message : 'فشل حفظ تأجير العقار');
    }
  }, [wholeRental]);

  // إحصائيات الوحدات
  const rented = units.filter(u => u.status === 'مؤجرة').length;
  const vacant = units.filter(u => u.status === 'شاغرة').length;
  const maintenance = units.filter(u => u.status === 'صيانة').length;

  const getPaymentInfo = (contractId: string) => {
    const payment = tenantPayments.find(p => p.contract_id === contractId);
    return payment ? payment.paid_months : 0;
  };

  const isPending = unitMutations.isPending || wholeRental.isPending;

  return {
    // بيانات
    units, isLoading, tenantPayments, paymentInvoices,
    wholePropertyContracts: wholeRental.wholePropertyContracts,
    wholePropertyContract: wholeRental.wholePropertyContract,
    rented, vacant, maintenance,
    // حالة النموذج
    rentalMode, setRentalMode,
    isUnitFormOpen: unitMutations.isUnitFormOpen, setIsUnitFormOpen: unitMutations.setIsUnitFormOpen,
    editingUnit: unitMutations.editingUnit, unitForm: unitMutations.unitForm, setUnitForm: unitMutations.setUnitForm,
    deleteUnitTarget: unitMutations.deleteUnitTarget, setDeleteUnitTarget: unitMutations.setDeleteUnitTarget,
    // عمليات
    resetUnitForm: unitMutations.resetUnitForm,
    handleUnitSubmit: unitMutations.handleUnitSubmit,
    handleEditUnit: unitMutations.handleEditUnit,
    handleConfirmDeleteUnit: unitMutations.handleConfirmDeleteUnit,
    handleWholePropertySave,
    getPaymentInfo,
    isPending,
  };
}
