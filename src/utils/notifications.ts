/**
 * Centralized notification utilities.
 * All notification calls should use these functions for consistency.
 * Calls are fire-and-forget (non-blocking) to avoid impacting main operations.
 */
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/** Send notification to all beneficiaries (fire-and-forget) */
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
      p_link: link ?? null,
    })
    .then(({ error }) => {
      if (error) logger.error('Failed to notify beneficiaries:', error);
    });
};

/** Send notification to all admins (fire-and-forget) */
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

/** Send notification to a specific user (fire-and-forget) */
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
