/**
 * خدمة الإشعارات — استدعاءات Supabase لإرسال إشعارات (fire-and-forget)
 * نُقلت من utils/notifications.ts لأنها ليست pure functions
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/** إرسال إشعار لجميع المستفيدين (fire-and-forget) */
export const notifyAllBeneficiaries = (
  title: string,
  message: string,
  type = 'info',
  link?: string,
): void => {
  supabase
    .rpc('notify_all_beneficiaries', {
      p_title: title,
      p_message: message,
      p_type: type,
      p_link: link ?? undefined,
    })
    .then(({ error }) => {
      if (error) logger.error('Failed to notify beneficiaries:', error);
    });
};

/** إرسال إشعار لجميع المدراء (fire-and-forget) */
export const notifyAdmins = (
  title: string,
  message: string,
  type = 'info',
  link?: string,
): void => {
  supabase
    .rpc('notify_admins', {
      p_title: title,
      p_message: message,
      p_type: type,
      p_link: link ?? undefined,
    })
    .then(({ error }) => {
      if (error) logger.error('Failed to notify admins:', error);
    });
};

/** إرسال إشعار لمستخدم محدد (fire-and-forget) */
export const notifyUser = (
  userId: string,
  title: string,
  message: string,
  type = 'info',
  link?: string,
): void => {
  supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type,
      link: link ?? null,
    })
    .then(({ error }) => {
      if (error) logger.error('Failed to notify user:', error);
    });
};
