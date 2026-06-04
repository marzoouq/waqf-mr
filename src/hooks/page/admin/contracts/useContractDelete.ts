/**
 * هوك حذف العقد مع حماية الأرشيف المحاسبي.
 * مُستخرج من useContractForm للالتزام بحد 200 سطر (Container/Presentational).
 *
 * القواعد:
 * - عقد بفواتير مدفوعة → حذف ممنوع (يحمي ZATCA و income المحفوظ).
 * - عقد بفواتير معلقة فقط → cascade: حذف الفواتير ثم العقد بعد تأكيد.
 * - عقد بدون فواتير → حذف مباشر بعد تأكيد قياسي من الواجهة.
 */
import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import {
  useDeleteContract,
} from '@/hooks/data/contracts/useContracts';
import { useDeleteContractPendingInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import {
  notifyDeleteBlockedByPaid,
  confirmDeleteWithPending,
  notifyPendingInvoicesDeleted,
} from '@/lib/contracts/invoiceSync';

interface UseContractDeleteParams {
  onSettled?: () => void;
}

export function useContractDelete({ onSettled }: UseContractDeleteParams = {}) {
  const deleteContract = useDeleteContract();
  const deletePendingInvoices = useDeleteContractPendingInvoices();

  const deleteWithGuard = useCallback(
    async (target: { id: string; name: string }) => {
      const { data: existingInvoices, error } = await supabase
        .from('payment_invoices')
        .select('status')
        .eq('contract_id', target.id);

      if (error) {
        logger.warn('Failed to read invoices before delete:', error.message);
        onSettled?.();
        return false;
      }

      const paidCount = existingInvoices?.filter(i => i.status === 'paid').length ?? 0;
      const pendingCount = existingInvoices?.filter(i => i.status === 'pending').length ?? 0;

      if (paidCount > 0) {
        notifyDeleteBlockedByPaid(paidCount);
        onSettled?.();
        return false;
      }

      if (pendingCount > 0 && !confirmDeleteWithPending(pendingCount, target.name)) {
        return false;
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
    [deleteContract, deletePendingInvoices, onSettled],
  );

  return {
    deleteWithGuard,
    isPending: deleteContract.isPending || deletePendingInvoices.isPending,
  };
}
