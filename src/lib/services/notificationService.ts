/**
 * خدمة إرسال الإشعارات عبر RPCs
 */
import { supabase } from '@/integrations/supabase/client';

export const notifyAdmins = async (title: string, message: string, type = 'info', link?: string) => {
  const { error } = await supabase.rpc('notify_admins', {
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link ?? undefined,
  });
  if (error) throw error;
};

export const notifyAllBeneficiaries = async (title: string, message: string, type = 'info', link?: string) => {
  const { error } = await supabase.rpc('notify_all_beneficiaries', {
    p_title: title,
    p_message: message,
    p_type: type,
    p_link: link ?? undefined,
  });
  if (error) throw error;
};

export const insertNotifications = async (notifications: Array<{ user_id: string; title: string; message: string; type: string; link: string | null }>) => {
  const { error } = await supabase.from('notifications').insert(notifications);
  if (error) throw error;
};
