/**
 * useEmailMonitorActions — يفصل DLQ retry + refresh عن orchestrator
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export function useEmailMonitorActions() {
  const qc = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: async (queue: 'auth_emails' | 'transactional_emails') => {
      return await invoke<{ ok: boolean; moved: number; error: string | null }>(
        'email-admin',
        { body: { action: 'retry_dlq', queue } },
      );
    },
    onSuccess: (data, queue) => {
      if (data.error) {
        toast.error(`فشلت إعادة المحاولة: ${data.error}`);
      } else {
        toast.success(`تم إعادة جدولة ${data.moved} رسالة من ${queue === 'auth_emails' ? 'بريد المصادقة' : 'البريد التشغيلي'}`);
      }
      qc.invalidateQueries({ queryKey: ['email-admin-stats'] });
      qc.invalidateQueries({ queryKey: ['email-logs'] });
    },
    onError: (err: unknown) => {
      logger.error('retry_dlq failed', err);
      toast.error('حدث خطأ أثناء إعادة المحاولة');
    },
  });

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['email-logs'] });
    qc.invalidateQueries({ queryKey: ['email-admin-stats'] });
  }, [qc]);

  return {
    retry: retryMutation.mutate,
    isRetrying: retryMutation.isPending,
    refresh,
  };
}
