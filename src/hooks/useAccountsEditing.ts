/**
 * حالة التحرير في صفحة الحسابات — collection editing + contract editing + delete
 */
import { useState } from 'react';
import { useUpdateContract, useDeleteContract } from '@/hooks/useContracts';
import { useDeleteAccount } from '@/hooks/useAccounts';
import { useUpsertTenantPayment } from '@/hooks/useTenantPayments';
import { toast } from 'sonner';

interface CollectionEditData {
  contractId: string;
  tenantName: string;
  monthlyRent: number;
  paidMonths: number;
  status: string;
}

interface ContractEditData {
  id: string;
  tenant_name: string;
  rent_amount: number;
  status: string;
  contract_number: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any — الأنواع تأتي من hooks متعددة
type AnyRecord = Record<string, any>;

interface EditingParams {
  contracts: AnyRecord[];
  collectionData: Array<{ tenantName: string; paymentPerPeriod: number; paidMonths: number; status: string }>;
  tenantPayments: Array<{ contract_id: string; paid_months: number }>;
  fiscalYearId: string | null | undefined;
  getExpectedPayments: (contract: AnyRecord) => number;
}

export function useAccountsEditing({ contracts, collectionData, tenantPayments, fiscalYearId, getExpectedPayments }: EditingParams) {
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();
  const deleteAccount = useDeleteAccount();
  const upsertPayment = useUpsertTenantPayment();

  // حالة تحرير جدول التحصيل
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editData, setEditData] = useState<CollectionEditData | null>(null);

  // حوار تحرير العقد
  const [contractEditOpen, setContractEditOpen] = useState(false);
  const [editingContractData, setEditingContractData] = useState<ContractEditData | null>(null);

  // تأكيد الحذف
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  const handleStartEdit = (index: number) => {
    const item = collectionData[index];
    const contract = contracts[index];
    setEditingIndex(index);
    setEditData({
      contractId: contract.id,
      tenantName: item.tenantName,
      monthlyRent: item.paymentPerPeriod,
      paidMonths: item.paidMonths,
      status: item.status,
    });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditData(null);
  };

  const handleSaveEdit = async () => {
    if (!editData) return;
    const contract = contracts.find(c => c.id === editData.contractId);
    if (!contract) { toast.error('العقد غير موجود'); return; }
    try {
      await updateContract.mutateAsync({
        id: contract.id,
        tenant_name: editData.tenantName,
        payment_amount: editData.monthlyRent,
      });

      const expectedPmts = getExpectedPayments(contract);
      await upsertPayment.mutateAsync({
        contract_id: contract.id,
        paid_months: editData.paidMonths,
        notes: editData.status === 'مكتمل' ? '' : `متأخر ${expectedPmts - editData.paidMonths} دفعات`,
        auto_income: editData.paidMonths > (tenantPayments.find(p => p.contract_id === contract.id)?.paid_months ?? 0) ? {
          payment_amount: editData.monthlyRent,
          property_id: contract.property_id,
          fiscal_year_id: fiscalYearId === 'all' ? null : (fiscalYearId ?? null),
          tenant_name: editData.tenantName,
        } : undefined,
      });

      setEditingIndex(null);
      setEditData(null);
    } catch {
      // handled by hooks
    }
  };

  const handleOpenContractEdit = (contract: ContractEditData) => {
    setEditingContractData({ ...contract, rent_amount: Number(contract.rent_amount) });
    setContractEditOpen(true);
  };

  const handleSaveContractEdit = async () => {
    if (!editingContractData) return;
    try {
      await updateContract.mutateAsync({
        id: editingContractData.id,
        tenant_name: editingContractData.tenant_name,
        rent_amount: editingContractData.rent_amount,
        status: editingContractData.status,
      });
      setContractEditOpen(false);
      setEditingContractData(null);
    } catch {
      // handled
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'contract') {
        await deleteContract.mutateAsync(deleteTarget.id);
      } else if (deleteTarget.type === 'account') {
        await deleteAccount.mutateAsync(deleteTarget.id);
      }
    } catch {
      // handled
    }
    setDeleteTarget(null);
  };

  return {
    editingIndex, editData, setEditData,
    handleStartEdit, handleCancelEdit, handleSaveEdit,
    contractEditOpen, setContractEditOpen, editingContractData, setEditingContractData,
    handleOpenContractEdit, handleSaveContractEdit,
    deleteTarget, setDeleteTarget, handleConfirmDelete,
    updateContractPending: updateContract.isPending,
    upsertPaymentPending: upsertPayment.isPending,
  };
}
