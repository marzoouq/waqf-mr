/**
 * هوك إرسال الرسائل الجماعية — UI state + toasts فقط.
 * الاستعلامات الخام مُفوَّضة إلى messagingService.sendBroadcastToRecipient (M2.4 refinement).
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { messagingService, enqueueUserNotification } from '@/lib/services';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';
import { messagingKeys } from '@/lib/queryKeys/messagingKeys';

export const useBulkMessageSender = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sending, setSending] = useState(false);

  const sendBulkMessage = useCallback(async (
    recipients: Array<{ id: string; name: string; user_id: string | null }>,
    subject: string,
    message: string,
  ) => {
    if (!user) return 0;
    setSending(true);
    let successCount = 0;

    try {
      const subjectText = subject.trim() || 'رسالة من ناظر الوقف';
      const content = message.trim();

      for (const b of recipients) {
        try {
          const ok = await messagingService.sendBroadcastToRecipient({
            senderId: user.id,
            recipientUserId: b.user_id,
            recipientName: b.name,
            subject: subjectText,
            content,
          });
          if (!ok) continue;

          enqueueUserNotification(
            b.user_id!,
            'رسالة جديدة من ناظر الوقف',
            `لديك رسالة جديدة: "${subjectText}"`,
            'info',
            '/beneficiary/messages',
          );

          successCount++;
        } catch (err) {
          logger.error('خطأ أثناء إرسال رسالة للمستفيد:', b.name, err);
        }
      }

      if (successCount > 0) {
        uiNotify.success(`تم إرسال الرسالة لـ ${successCount} مستفيد`);
        queryClient.invalidateQueries({ queryKey: messagingKeys.conversations.prefix });
      } else {
        uiNotify.error('فشل إرسال الرسالة لجميع المستفيدين');
      }
    } catch {
      uiNotify.error('حدث خطأ أثناء إرسال الرسائل');
    } finally {
      setSending(false);
    }

    return successCount;
  }, [user, queryClient]);

  return { sendBulkMessage, sending };
};
