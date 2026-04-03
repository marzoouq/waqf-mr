/**
 * خدمة الإشعارات الموحّدة — تجمع جميع وظائف الإشعارات في مكان واحد
 * تدعم أنماط fire-and-forget و async/throw
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/* ────────────── async/throw — تُستخدم داخل mutations ────────────── */

/** إرسال إشعار لجميع المدراء (async — يرمي خطأ عند الفشل) */
export const notifyAdmins = async (title: string, message: string, type = 'info', link?: string) => {
  const { error } = await supabase.rpc('notify_admins', {
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link ?? undefined,
  });
  if (error) throw error;
};

/** إرسال إشعار لجميع المستفيدين (async — يرمي خطأ عند الفشل) */
export const notifyAllBeneficiaries = async (title: string, message: string, type = 'info', link?: string) => {
  const { error } = await supabase.rpc('notify_all_beneficiaries', {
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link ?? undefined,
  });
  if (error) throw error;
};

/** إدراج إشعارات مجمّعة (async — يرمي خطأ عند الفشل) */
export const insertNotifications = async (
  notifications: Array<{ user_id: string; title: string; message: string; type: string; link: string | null }>,
) => {
  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) throw error;
};

/* ────────────── fire-and-forget — تُستخدم كتأثير جانبي ────────────── */

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

/** إرسال إشعار لجميع المدراء (fire-and-forget) */
export const notifyAdminsSilent = (title: string, message: string, type = 'info', link?: string): void => {
  notifyAdmins(title, message, type, link).catch((err) => {
    logger.error('Failed to notify admins:', err);
  });
};

/** إرسال إشعار لجميع المستفيدين (fire-and-forget) */
export const notifyAllBeneficiariesSilent = (title: string, message: string, type = 'info', link?: string): void => {
  notifyAllBeneficiaries(title, message, type, link).catch((err) => {
    logger.error('Failed to notify beneficiaries:', err);
  });
};
