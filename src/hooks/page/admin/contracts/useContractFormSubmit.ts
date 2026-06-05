/**
 * useContractFormSubmit — منطق الإرسال (إنشاء/تحديث) المُستخرَج من useContractForm.
 * يتضمّن: مزامنة allocations + توليد/إعادة توليد الفواتير + التوست الموحّد.
 * استُخرج في المرحلة 1.2 لإبقاء useContractForm orchestrator صغير.
 */
import { useCallback } from 'react';
import type { Contract } from '@/types';
import type { ContractFormData } from '@/types/forms/contract';
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
import { allocateContractToFiscalYears } from '@/utils/financial/contractAllocation';
import { getPaymentCount } from '@/utils/financial/contractHelpers';
import { asMutationArg } from '@/hooks/data/core';
import { buildContractPayload } from '@/utils/contracts/contractFormBuilders';
import { validateContractForm } from '@/utils/contracts/contractFormValidation';

interface Params {
  fiscalYearId: string;
  fiscalYears: Array<{ id: string; status: string }> | undefined;
  editingContract: Contract | null;
  requestRegenerateConfirm: (paid: number, pending: number) => Promise<boolean>;
}

export function useContractFormSubmit({ fiscalYearId, fiscalYears, editingContract, requestRegenerateConfirm }: Params) {
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const upsertAllocations = useUpsertContractAllocations();
  const generateInvoices = useGenerateContractInvoices();
  const deletePendingInvoices = useDeleteContractPendingInvoices();
  const { data: fiscalYearsFull = [] } = useFiscalYears();

  const syncAllocations = useCallback(
    async (contractId: string, contract: { start_date: string; end_date: string; rent_amount: number; payment_type?: string; payment_count?: number; payment_amount?: number }) => {
      if (!fiscalYearsFull.length) return;
      try {
        const allocations = allocateContractToFiscalYears({ id: contractId, ...contract }, fiscalYearsFull);
        if (allocations.length > 0) await upsertAllocations.mutateAsync(allocations);
      } catch (err) {
        logger.warn('Allocation sync skipped:', err instanceof Error ? err.message : String(err));
      }
    },
    [fiscalYearsFull, upsertAllocations],
  );

  const submit = async (formData: ContractFormData, isEditing: boolean) => {
    const validationError = validateContractForm(formData);
    if (validationError) {
      uiNotify.error(validationError.message);
      return;
    }
    const paymentCount = getPaymentCount({ payment_type: formData.payment_type, payment_count: parseInt(formData.payment_count) || 1 });

    if (isEditing && editingContract) {
      const rentAmount = parseFloat(formData.rent_amount);
      const payload = buildContractPayload({
        formData, contractNumber: formData.contract_number,
        unitId: formData.unit_id || null, rentAmount, paymentCount,
      });

      const { paidCount, pendingCount } = await fetchContractInvoiceSummary(editingContract.id);
      if (paidCount > 0) {
        const ok = await requestRegenerateConfirm(paidCount, pendingCount);
        if (!ok) return;
      }

      await updateContract.mutateAsync(asMutationArg(updateContract, { id: editingContract.id, ...payload }));
      await syncAllocations(editingContract.id, { start_date: formData.start_date, end_date: formData.end_date, rent_amount: rentAmount, payment_type: formData.payment_type, payment_count: paymentCount, payment_amount: rentAmount / paymentCount });
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
    if (!activeFYId) activeFYId = fiscalYears?.find(fy => fy.status === 'active')?.id || null;
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
        const payload = buildContractPayload({ formData, contractNumber, unitId, rentAmount, paymentCount, fiscalYearId: activeFYId });
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
      notifyContractsCreatedWithInvoices(formData.tenant_name, createdContracts, totalInvoices);
    } else {
      const rentAmount = parseFloat(formData.rent_amount);
      const unitId = (formData.rental_mode === 'single'
        ? formData.unit_id
        : (formData.rental_mode === 'multi' && formData.selected_unit_ids.length === 1 ? formData.selected_unit_ids[0] : null)) || null;
      const payload = buildContractPayload({ formData, contractNumber: formData.contract_number, unitId, rentAmount, paymentCount, fiscalYearId: activeFYId });
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

  return { submit, createContract, updateContract };
}
