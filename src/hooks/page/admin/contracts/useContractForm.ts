/**
 * هوك CRUD نموذج العقد — منطق التحرير والتجديد والإنشاء.
 * المُنشئات النقية (renew/edit/payload) في `src/utils/contracts/contractFormBuilders.ts` (#A3).
 *
 * P1-1: بعد كل إنشاء/تحديث للعقد نُحدِّث `contract_fiscal_allocations`
 * تلقائياً لضمان دقة الإيرادات والاستحقاق في صفحات العقارات.
 */
import { useState, useCallback } from 'react';
import { Contract } from '@/types';
import { emptyFormData, type ContractFormData } from '@/types/forms/contract';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { useCreateContract, useUpdateContract } from '@/hooks/data/contracts/useContracts';
import { useUpsertContractAllocations } from '@/hooks/data/financial/contracts/useContractAllocations';
import { useFiscalYears } from '@/hooks/data/financial/fiscalYears/useFiscalYears';
import {
  useGenerateContractInvoices,
  useDeleteContractPendingInvoices,
} from '@/hooks/data/invoices/usePaymentInvoices';
import { supabase } from '@/integrations/supabase/client';
import { confirmRegenerateWithPaid } from '@/lib/contracts/invoiceSync';
import { useContractDelete } from './useContractDelete';
import { allocateContractToFiscalYears } from '@/utils/financial/contractAllocation';
import { getPaymentCount } from '@/utils/financial/contractHelpers';
import { asMutationArg } from '@/hooks/data/core';
import {
  buildRenewInitialData,
  buildEditInitialData,
  buildContractPayload,
} from '@/utils/contracts/contractFormBuilders';

interface UseContractFormParams {
  fiscalYearId: string;
  fiscalYears: Array<{ id: string; status: string }> | undefined;
}

export function useContractForm({ fiscalYearId, fiscalYears }: UseContractFormParams) {
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const upsertAllocations = useUpsertContractAllocations();
  const generateInvoices = useGenerateContractInvoices();
  const deletePendingInvoices = useDeleteContractPendingInvoices();
  const { data: fiscalYearsFull = [] } = useFiscalYears();
  const contractDelete = useContractDelete();

  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);

  const resetForm = useCallback(() => {
    setEditingContract(null);
    setFormInitialData(emptyFormData);
  }, []);

  const handleRenew = useCallback((contract: Contract) => {
    setFormInitialData(buildRenewInitialData(contract));
    setEditingContract(null);
    setIsOpen(true);
  }, []);

  const handleEdit = useCallback((contract: Contract) => {
    setEditingContract(contract);
    setFormInitialData(buildEditInitialData(contract));
    setIsOpen(true);
  }, []);

  // P1-1: مزامنة تخصيصات السنوات المالية بعد كل عملية حفظ.
  // مكتومة الأخطاء لئلا تكسر تجربة المستخدم — التخصيصات تُقرأ في صفحات
  // العقارات/التقارير، وغيابها يعود لـ fallback آمن في usePropertyFinancials.
  const syncAllocations = useCallback(
    async (contractId: string, contract: { start_date: string; end_date: string; rent_amount: number; payment_type?: string; payment_count?: number; payment_amount?: number }) => {
      if (!fiscalYearsFull.length) return;
      try {
        const allocations = allocateContractToFiscalYears(
          { id: contractId, ...contract },
          fiscalYearsFull,
        );
        if (allocations.length > 0) {
          await upsertAllocations.mutateAsync(allocations);
        }
      } catch (err) {
        logger.warn('Allocation sync skipped:', err instanceof Error ? err.message : String(err));
      }
    },
    [fiscalYearsFull, upsertAllocations],
  );

  const handleFormSubmit = async (formData: ContractFormData, isEditing: boolean) => {
    if (formData.end_date <= formData.start_date) {
      uiNotify.error('تاريخ الانتهاء يجب أن يكون بعد تاريخ البداية');
      return;
    }
    const paymentCount = getPaymentCount({ payment_type: formData.payment_type, payment_count: parseInt(formData.payment_count) || 1 });

    if (isEditing && editingContract) {
      const rentAmount = parseFloat(formData.rent_amount);
      const payload = buildContractPayload({
        formData, contractNumber: formData.contract_number,
        unitId: formData.unit_id || null, rentAmount, paymentCount,
      });

      // فحص الفواتير المدفوعة قبل إعادة التوليد — يحمي الأرشيف المحاسبي
      const { data: existingInvoices } = await supabase
        .from('payment_invoices')
        .select('status')
        .eq('contract_id', editingContract.id);
      const paidCount = existingInvoices?.filter(i => i.status === 'paid').length ?? 0;
      const pendingCount = existingInvoices?.filter(i => i.status === 'pending').length ?? 0;
      if (paidCount > 0 && !confirmRegenerateWithPaid(paidCount, pendingCount)) {
        return;
      }

      await updateContract.mutateAsync(asMutationArg(updateContract, { id: editingContract.id, ...payload }));
      await syncAllocations(editingContract.id, { start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount, payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: rentAmount / paymentCount });
      // إعادة توليد الفواتير المعلقة وفق القيم الجديدة (المدفوعة محفوظة)
      try {
        await deletePendingInvoices.mutateAsync(editingContract.id);
        await generateInvoices.mutateAsync(editingContract.id);
      } catch (err) {
        logger.warn('Invoice regeneration failed:', err instanceof Error ? err.message : String(err));
      }
      return;
    }

    const contextFYId = fiscalYearId && fiscalYearId !== 'all' ? fiscalYearId : null;
    let activeFYId = contextFYId;
    if (!activeFYId) {
      activeFYId = fiscalYears?.find(fy => fy.status === 'active')?.id || null;
    }
    const suffixLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

    if (formData.rental_mode === 'multi' && formData.selected_unit_ids.length > 1) {
      const units = formData.selected_unit_ids;
      let created = 0;
      for (let i = 0; i < units.length; i++) {
        const unitId = units[i]!;
        const contractNumber = `${formData.contract_number}-${suffixLetters[i] || (i + 1)}`;
        const rentAmount = formData.pricing_mode === 'per_unit'
          ? (parseFloat(formData.rent_per_unit[unitId] ?? '0') || 0)
          : (parseFloat(formData.rent_amount) / units.length);
        const payload = buildContractPayload({
          formData, contractNumber, unitId, rentAmount, paymentCount, fiscalYearId: activeFYId,
        });
        const createdMulti = await createContract.mutateAsync(asMutationArg(createContract, payload));
        const newIdMulti = (createdMulti as { id?: string } | undefined)?.id;
        if (newIdMulti) {
          await syncAllocations(newIdMulti, { start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount, payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: rentAmount / paymentCount });
          try { await generateInvoices.mutateAsync(newIdMulti); }
          catch (err) { logger.warn('Invoice generation failed:', err instanceof Error ? err.message : String(err)); }
        }
        created++;
      }
      uiNotify.success(`تم إنشاء ${created} عقد للمستأجر ${formData.tenant_name}`);
    } else {
      const rentAmount = parseFloat(formData.rent_amount);
      const unitId = (formData.rental_mode === 'single'
        ? formData.unit_id
        : (formData.rental_mode === 'multi' && formData.selected_unit_ids.length === 1 ? formData.selected_unit_ids[0] : null)) || null;
      const payload = buildContractPayload({
        formData, contractNumber: formData.contract_number, unitId, rentAmount, paymentCount, fiscalYearId: activeFYId,
      });
      const createdSingle = await createContract.mutateAsync(asMutationArg(createContract, payload));
      const newIdSingle = (createdSingle as { id?: string } | undefined)?.id;
      if (newIdSingle) {
        await syncAllocations(newIdSingle, { start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount, payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: rentAmount / paymentCount });
        try { await generateInvoices.mutateAsync(newIdSingle); }
        catch (err) { logger.warn('Invoice generation failed:', err instanceof Error ? err.message : String(err)); }
      }
    }
  };

  /**
   * حذف عقد مع حماية الأرشيف المحاسبي:
   * - يفحص الفواتير قبل الحذف
   * - يمنع الحذف عند وجود فواتير مدفوعة
   * - يحذف الفواتير المعلقة معه (cascade منطقي)
   */
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const { data: existingInvoices } = await supabase
      .from('payment_invoices')
      .select('status')
      .eq('contract_id', deleteTarget.id);
    const paidCount = existingInvoices?.filter(i => i.status === 'paid').length ?? 0;
    const pendingCount = existingInvoices?.filter(i => i.status === 'pending').length ?? 0;

    if (paidCount > 0) {
      notifyDeleteBlockedByPaid(paidCount);
      setDeleteTarget(null);
      return;
    }
    if (pendingCount > 0 && !confirmDeleteWithPending(pendingCount, deleteTarget.name)) {
      return;
    }
    if (pendingCount > 0) {
      try {
        const deleted = await deletePendingInvoices.mutateAsync(deleteTarget.id);
        notifyPendingInvoicesDeleted(deleted);
      } catch (err) {
        logger.warn('Pending invoice cleanup failed:', err instanceof Error ? err.message : String(err));
      }
    }
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
