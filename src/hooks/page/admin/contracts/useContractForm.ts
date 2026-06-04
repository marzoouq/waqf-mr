/**
 * هوك CRUD نموذج العقد — منطق التحرير والتجديد والإنشاء.
 * المُنشئات النقية (renew/edit/payload) في `src/utils/contracts/contractFormBuilders.ts` (#A3).
 *
 * P1-1: بعد كل إنشاء/تحديث للعقد نُحدِّث `contract_fiscal_allocations`
 * تلقائياً لضمان دقة الإيرادات والاستحقاق في صفحات العقارات.
 *
 * الإشعارات: تصدر من هنا فقط (طبقة الصفحة) عبر `lib/contracts/invoiceSync`.
 * data hooks للفواتير نقية بدون toast (راجع mem://conventions/no-toast-in-data-hooks).
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
  fetchContractInvoiceSummary,
} from '@/hooks/data/invoices/usePaymentInvoices';
import {
  notifyInvoicesGenerated,
  notifyInvoicesRegenerated,
  notifyContractsCreatedWithInvoices,
} from '@/lib/contracts/invoiceSync';
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

  // Batch 2E: تأكيد إعادة توليد الفواتير عند وجود مدفوعات — Promise + AlertDialog.
  const [regenConfirmTarget, setRegenConfirmTarget] = useState<
    { paidCount: number; pendingCount: number; resolve: (ok: boolean) => void } | null
  >(null);

  const requestRegenerateConfirm = useCallback(
    (paidCount: number, pendingCount: number) =>
      new Promise<boolean>((resolve) => {
        setRegenConfirmTarget({ paidCount, pendingCount, resolve });
      }),
    [],
  );

  const resolveRegenerateConfirm = useCallback((ok: boolean) => {
    setRegenConfirmTarget((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

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
      const { paidCount, pendingCount } = await fetchContractInvoiceSummary(editingContract.id);
      if (paidCount > 0) {
        const ok = await requestRegenerateConfirm(paidCount, pendingCount);
        if (!ok) return;
      }

      await updateContract.mutateAsync(asMutationArg(updateContract, { id: editingContract.id, ...payload }));
      await syncAllocations(editingContract.id, { start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount, payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: rentAmount / paymentCount });
      // إعادة توليد الفواتير المعلقة وفق القيم الجديدة (المدفوعة محفوظة)
      try {
        await deletePendingInvoices.mutateAsync(editingContract.id);
        const generatedCount = await generateInvoices.mutateAsync(editingContract.id);
        notifyInvoicesRegenerated(generatedCount);
      } catch (err) {
        logger.warn('Invoice regeneration failed:', err instanceof Error ? err.message : String(err));
        uiNotify.error('فشل إعادة توليد الفواتير المعلقة');
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
      let createdContracts = 0;
      let totalInvoices = 0;
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
          try {
            const count = await generateInvoices.mutateAsync(newIdMulti);
            totalInvoices += count;
          } catch (err) {
            logger.warn('Invoice generation failed:', err instanceof Error ? err.message : String(err));
          }
        }
        createdContracts++;
      }
      // توست موحّد بدل 2N+1 توست — يحلّ محل توست factory create (يُلَمّ بالـ dedup)
      notifyContractsCreatedWithInvoices(formData.tenant_name, createdContracts, totalInvoices);
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
        try {
          const count = await generateInvoices.mutateAsync(newIdSingle);
          notifyInvoicesGenerated(count);
        } catch (err) {
          logger.warn('Invoice generation failed:', err instanceof Error ? err.message : String(err));
        }
      }
    }
  };

  // الحذف يمر عبر useContractDelete الذي يحمي الأرشيف المحاسبي
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await contractDelete.deleteWithGuard(deleteTarget);
    setDeleteTarget(null);
  };

  return {
    createContract, updateContract,
    deleteContract: { isPending: contractDelete.isPending },
    isOpen, setIsOpen, editingContract,
    deleteTarget, setDeleteTarget,
    formInitialData,
    resetForm, handleRenew, handleEdit, handleFormSubmit, handleConfirmDelete,
    isPending: createContract.isPending || updateContract.isPending || contractDelete.isPending,
    // Batch 2E — تأكيد إعادة توليد الفواتير
    regenConfirmTarget, resolveRegenerateConfirm,
    // Batch 2E — تأكيد حذف عقد ذو فواتير معلقة (مُمرَّر من useContractDelete)
    confirmPendingDelete: contractDelete.confirmPendingTarget,
    resolvePendingDelete: contractDelete.resolvePendingConfirm,
  };
}
