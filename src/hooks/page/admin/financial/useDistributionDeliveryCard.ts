/**
 * Page hook for confirming delivery of pending distributions (admin only).
 */
import { useState } from 'react';
import { toast } from 'sonner';
import {
  usePendingDistributions,
  useConfirmDistributionDelivery,
  type DeliveryMethod,
} from '@/hooks/data/financial/distribution/useDistributionDelivery';

const todayRiyadh = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Riyadh' }).format(new Date());

export const useDistributionDeliveryCard = (fiscalYearId: string | undefined) => {
  const pending = usePendingDistributions(fiscalYearId);
  const confirm = useConfirmDistributionDelivery();
  const [targetIds, setTargetIds] = useState<string[] | null>(null);
  const [paidAt, setPaidAt] = useState(todayRiyadh());
  const [method, setMethod] = useState<DeliveryMethod>('bank_transfer');
  const [reference, setReference] = useState('');

  const items = pending.data ?? [];
  const total = items.reduce((s, d) => s + d.amount, 0);

  const open = (ids: string[]) => {
    setPaidAt(todayRiyadh());
    setReference('');
    setTargetIds(ids);
  };

  const submit = async () => {
    if (!targetIds?.length) return;
    try {
      const n = await confirm.mutateAsync({ ids: targetIds, paidAt, method, reference });
      toast.success(`تم تأكيد تسليم ${n} توزيع وإشعار المستفيدين`);
      setTargetIds(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذّر تأكيد التسليم');
    }
  };

  return {
    items, total, isLoading: pending.isLoading,
    targetIds, open, close: () => setTargetIds(null),
    paidAt, setPaidAt, method, setMethod, reference, setReference,
    submit, isSubmitting: confirm.isPending, maxDate: todayRiyadh(),
  };
};
