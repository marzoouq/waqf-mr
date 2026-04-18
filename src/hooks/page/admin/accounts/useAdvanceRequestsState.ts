/**
 * useAdvanceRequestsState — حالة محلية لجدول طلبات السلف
 *
 * يستخرج state + handlers من AdvanceRequestsTab
 * ليبقى المكوّن UI خالصاً.
 */
import { useState } from 'react';
import { useAdvanceRequests, useUpdateAdvanceStatus, type AdvanceRequest } from '@/hooks/data/financial/useAdvanceRequests';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { isFyAll } from '@/constants/fiscalYearIds';

const PAGE_SIZE = 20;

export interface RejectTarget {
  id: string;
  userId?: string;
  amount?: number;
}

export function useAdvanceRequestsState() {
  const { fiscalYearId } = useFiscalYear();
  const fyId = fiscalYearId && !isFyAll(fiscalYearId) ? fiscalYearId : undefined;
  const [page, setPage] = useState(0);
  const { data: requests = [], isLoading } = useAdvanceRequests(fyId);
  const updateStatus = useUpdateAdvanceStatus();
  const { getJsonSetting } = useAppSettings();
  const advanceSettings = getJsonSetting('advance_settings', { enabled: true, min_amount: 500, max_percentage: 50 });

  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const paginatedRequests = requests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleApprove = (req: AdvanceRequest) => updateStatus.mutate({
    id: req.id, status: 'approved',
    beneficiary_user_id: req.beneficiary?.user_id ?? undefined, amount: req.amount,
  });

  const handlePaid = (req: AdvanceRequest) => updateStatus.mutate({
    id: req.id, status: 'paid',
    beneficiary_user_id: req.beneficiary?.user_id ?? undefined, amount: req.amount,
  });

  const handleReject = async () => {
    if (!rejectTarget) return;
    try {
      await updateStatus.mutateAsync({
        id: rejectTarget.id, status: 'rejected', rejection_reason: rejectionReason,
        beneficiary_user_id: rejectTarget.userId, amount: rejectTarget.amount,
      });
      setRejectTarget(null);
      setRejectionReason('');
    } catch {
      // Toast يظهر من onError — الحوار يبقى مفتوحاً للمحاولة مرة أخرى
    }
  };

  const openReject = (req: AdvanceRequest) => setRejectTarget({
    id: req.id,
    userId: req.beneficiary?.user_id ?? undefined,
    amount: req.amount,
  });

  const closeReject = () => {
    setRejectTarget(null);
    setRejectionReason('');
  };

  return {
    requests, paginatedRequests, isLoading,
    page, setPage, totalPages,
    advanceSettings,
    isMutating: updateStatus.isPending,
    rejectTarget, rejectionReason, setRejectionReason,
    openReject, closeReject,
    handleApprove, handlePaid, handleReject,
  };
}
