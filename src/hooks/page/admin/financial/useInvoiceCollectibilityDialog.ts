import { useState } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useInvoiceCollectibility } from '@/hooks/data/invoices/useInvoiceCollectibility';
import { uiNotify } from '@/lib/notify';

export function useInvoiceCollectibilityDialog(id: string, uncollectible: boolean) {
  const { role } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const mutation = useInvoiceCollectibility();
  const confirm = () => {
    if (reason.trim().length < 3) { uiNotify.error('سبب تعذر التحصيل مطلوب'); return; }
    mutation.mutate({ id, uncollectible: !uncollectible, reason: reason.trim() }, {
      onSuccess: () => { uiNotify.success('تم تسجيل حالة التحصيل'); setOpen(false); setReason(''); },
      onError: (error) => uiNotify.error(error instanceof Error ? error.message : 'تعذر تسجيل حالة التحصيل'),
    });
  };
  return { isAdmin: role === 'admin', open, setOpen, reason, setReason, confirm, pending: mutation.isPending };
}