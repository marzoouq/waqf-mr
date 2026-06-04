/**
 * هوك حذف العقد مع حماية الأرشيف المحاسبي.
 * مُستخرج من useContractForm للالتزام بحد 200 سطر (Container/Presentational).
 *
 * القواعد:
 * - عقد بفواتير مدفوعة → حذف ممنوع (يحمي ZATCA و income المحفوظ).
 * - عقد بفواتير معلقة فقط → cascade: حذف الفواتير ثم العقد بعد تأكيد عبر AlertDialog.
 * - عقد بدون فواتير → حذف مباشر بعد تأكيد قياسي من الواجهة.
 *
 * Batch 2E: تأكيد الفواتير المعلقة أصبح عبر Promise resolver + AlertDialog
 * بدل `window.confirm`. حالة `confirmPendingTarget` تُعرض في الصفحة.
 */
import { useCallback, useState } from 'react';
import { logger } from '@/lib/logger';
import {
  useDeleteContract,
} from '@/hooks/data/contracts/useContracts';
import {
  useDeleteContractPendingInvoices,
  fetchContractInvoiceSummary,
} from '@/hooks/data/invoices/usePaymentInvoices';
import {
  notifyDeleteBlockedByPaid,
  notifyPendingInvoicesDeleted,
} from '@/lib/contracts/invoiceSync';

interface UseContractDeleteParams {
  onSettled?: () => void;
}

interface ConfirmPendingState {
  pendingCount: number;
  contractName: string;
  resolve: (ok: boolean) => void;
}

export function useContractDelete({ onSettled }: UseContractDeleteParams = {}) {
  const deleteContract = useDeleteContract();
  const deletePendingInvoices = useDeleteContractPendingInvoices();

  const [confirmPendingTarget, setConfirmPendingTarget] = useState<ConfirmPendingState | null>(null);

  const requestPendingConfirm = useCallback(
    (pendingCount: number, contractName: string) =>
      new Promise<boolean>((resolve) => {
        setConfirmPendingTarget({ pendingCount, contractName, resolve });
      }),
    [],
  );

  const resolvePendingConfirm = useCallback((ok: boolean) => {
    setConfirmPendingTarget((prev) => {
      prev?.resolve(ok);
      return null;
    });
  }, []);

  const deleteWithGuard = useCallback(
    async (target: { id: string; name: string }) => {
      let paidCount = 0;
      let pendingCount = 0;
      try {
        const summary = await fetchContractInvoiceSummary(target.id);
        paidCount = summary.paidCount;
        pendingCount = summary.pendingCount;
      } catch (err) {
        logger.warn('Failed to read invoices before delete:', err instanceof Error ? err.message : String(err));
        onSettled?.();
        return false;
      }

      if (paidCount > 0) {
        notifyDeleteBlockedByPaid(paidCount);
        onSettled?.();
        return false;
      }

      if (pendingCount > 0) {
        const ok = await requestPendingConfirm(pendingCount, target.name);
        if (!ok) return false;
      }

      if (pendingCount > 0) {
        try {
          const deleted = await deletePendingInvoices.mutateAsync(target.id);
          notifyPendingInvoicesDeleted(deleted);
        } catch (err) {
          logger.warn('Pending invoice cleanup failed:', err instanceof Error ? err.message : String(err));
        }
      }

      await deleteContract.mutateAsync(target.id);
      onSettled?.();
      return true;
    },
    [deleteContract, deletePendingInvoices, onSettled, requestPendingConfirm],
  );

  return {
    deleteWithGuard,
    isPending: deleteContract.isPending || deletePendingInvoices.isPending,
    confirmPendingTarget,
    resolvePendingConfirm,
  };
}
