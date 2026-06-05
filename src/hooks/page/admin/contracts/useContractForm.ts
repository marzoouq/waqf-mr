/**
 * هوك CRUD نموذج العقد — orchestrator صغير.
 * منطق الإرسال مُستخرج في `useContractFormSubmit` (المرحلة 1.2).
 * المُنشئات النقية (renew/edit/payload) في `@/utils/contracts/contractFormBuilders`.
 */
import { useState, useCallback } from 'react';
import type { Contract } from '@/types';
import { emptyFormData, type ContractFormData } from '@/types/forms/contract';
import { useContractDelete } from './useContractDelete';
import { useContractFormSubmit } from './useContractFormSubmit';
import { buildRenewInitialData, buildEditInitialData } from '@/utils/contracts/contractFormBuilders';

interface UseContractFormParams {
  fiscalYearId: string;
  fiscalYears: Array<{ id: string; status: string }> | undefined;
}

export function useContractForm({ fiscalYearId, fiscalYears }: UseContractFormParams) {
  const contractDelete = useContractDelete();

  const [isOpen, setIsOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [formInitialData, setFormInitialData] = useState<ContractFormData>(emptyFormData);

  // Batch 2E: تأكيد إعادة توليد الفواتير عند وجود مدفوعات.
  const [regenConfirmTarget, setRegenConfirmTarget] = useState<
    { paidCount: number; pendingCount: number; resolve: (ok: boolean) => void } | null
  >(null);

  const requestRegenerateConfirm = useCallback(
    (paidCount: number, pendingCount: number) =>
      new Promise<boolean>((resolve) => setRegenConfirmTarget({ paidCount, pendingCount, resolve })),
    [],
  );

  const resolveRegenerateConfirm = useCallback((ok: boolean) => {
    setRegenConfirmTarget((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  const { submit, createContract, updateContract } = useContractFormSubmit({
    fiscalYearId, fiscalYears, editingContract, requestRegenerateConfirm,
  });

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

  const handleFormSubmit = (formData: ContractFormData, isEditing: boolean) => submit(formData, isEditing);

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
    regenConfirmTarget, resolveRegenerateConfirm,
    confirmPendingDelete: contractDelete.confirmPendingTarget,
    resolvePendingDelete: contractDelete.resolvePendingConfirm,
  };
}
