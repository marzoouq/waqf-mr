/**
 * useEmailMonitorActions — يفصل DLQ retry + refresh عن orchestrator
 *
 * #A7: نتتبع الطابور النشط حالياً (activeQueue) كي لا يتعطّل زر الطابور الآخر
 * أثناء إعادة محاولة طابور واحد. الزرّان المنفصلان (auth/transactional) يحتاجان
 * مؤشر تحميل مستقل لكل طابور.
 */
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { logger } from '@/lib/logger';
import { uiNotify } from '@/lib/notify';
import { emailKeys } from '@/lib/queryKeys/emailKeys';

type DlqQueue = 'auth_emails' | 'transactional_emails';

export function useEmailMonitorActions() {
  const qc = useQueryClient();
  const [activeQueue, setActiveQueue] = useState<DlqQueue | null>(null);

  const retryMutation = useMutation({
    mutationFn: async (queue: DlqQueue) => {
      setActiveQueue(queue);
      return await invoke<{ ok: boolean; moved: number; error: string | null }>(
        'email-admin',
        { body: { action: 'retry_dlq', queue } },
      );
    },
    onSuccess: (data, queue) => {
      if (data.error) {
        uiNotify.error(`فشلت إعادة المحاولة: ${data.error}`);
      } else {
        uiNotify.success(`تم إعادة جدولة ${data.moved} رسالة من ${queue === 'auth_emails' ? 'بريد المصادقة' : 'البريد التشغيلي'}`);
      }
      qc.invalidateQueries({ queryKey: emailKeys.adminStats });
      qc.invalidateQueries({ queryKey: emailKeys.logsPrefix });
    },
    onError: (err: unknown) => {
      logger.error('retry_dlq failed', err);
      uiNotify.error('حدث خطأ أثناء إعادة المحاولة');
    },
    onSettled: () => {
      setActiveQueue(null);
    },
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: emailKeys.logsPrefix });
    qc.invalidateQueries({ queryKey: emailKeys.adminStats });
  }, [qc]);

  const retryingQueue: DlqQueue | null = retryMutation.isPending ? activeQueue : null;

  return {
    retry: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
    retryingQueue,
    refresh,
  };
}
