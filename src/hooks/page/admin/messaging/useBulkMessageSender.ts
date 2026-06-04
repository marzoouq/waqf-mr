/**
 * هوك إرسال الرسائل الجماعية — UI state + toasts.
 * نُقل من hooks/data/messaging/ لأنه يحتوي toast UI state.
 * استعلام المستفيدين يبقى في hooks/data/messaging/useBulkMessaging (useBeneficiariesForMessaging).
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enqueueUserNotification } from '@/lib/services';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { uiNotify } from '@/lib/notify';
import { logger } from '@/lib/logger';

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

      for (const b of recipients) {
        try {
          const { data: conv, error: convError } = await supabase
            .from('conversations')
            .insert({
              type: 'broadcast',
              subject: subjectText,
              created_by: user.id,
              participant_id: b.user_id,
            })
            .select()
            .single();

          if (convError) {
            logger.error('فشل إنشاء محادثة للمستفيد:', b.name, convError);
            continue;
          }

          const { error: msgError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conv.id,
              sender_id: user.id,
              content: message.trim(),
            });

          if (msgError) {
            logger.error('فشل إرسال رسالة للمستفيد:', b.name, msgError);
            continue;
          }

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
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
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
