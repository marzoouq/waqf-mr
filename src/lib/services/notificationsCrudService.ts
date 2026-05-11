/**
 * notificationsCrudService — عمليات CRUD على إشعارات المستخدم.
 * مكمّل لـ notificationService.ts (الذي يبثّ الإشعارات للمستخدمين عبر RPC).
 * مستخرج من useNotificationActions.ts ضمن M2.4.
 */
import { supabase } from '@/integrations/supabase/client';

export const notificationsCrudService = {
  async markAsRead(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },

  async markAllAsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throw error;
  },

  /**
   * حذف الإشعارات المقروءة، مع استثناء أنواع معينة (disabledTypes) التي يحتفظ
   * بها المستخدم رغم تعطيلها — يحاكي السلوك الأصلي بدون أي تغيير.
   */
  async deleteRead(userId: string, disabledTypes: Set<string>): Promise<void> {
    let query = supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId)
      .eq('is_read', true);
    if (disabledTypes.size > 0) {
      const typesArray = [...disabledTypes];
      query = query.not('type', 'in', `("${typesArray.join('","')}")`);
    }
    const { error } = await query;
    if (error) throw error;
  },

  async deleteOne(id: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    if (error) throw error;
  },
};
