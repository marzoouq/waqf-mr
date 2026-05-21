/**
 * هوك mutations و realtime للإشعارات — مستخرج من useNotifications.
 * تأثيرات UI/المتصفح (الصوت + إشعار المتصفح) منفصلة في
 * `@/hooks/ui/useNotificationSounds`.
 *
 * Audit-fix: استدعاءات notificationsCrudService مدمجة محلياً (كان بمستهلك واحد).
 */
import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Notification as AppNotification } from '@/types';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSounds } from '@/hooks/ui/useNotificationSounds';

async function markOneAsRead(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

async function markEveryAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
  if (error) throw error;
}

/**
 * حذف الإشعارات المقروءة مع استثناء أنواع معينة (disabledTypes) — السلوك الأصلي بدون تغيير.
 */
async function deleteReadExcluding(userId: string, disabledTypes: Set<string>): Promise<void> {
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
}

async function deleteOneNotification(id: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);
  if (error) throw error;
}

export const useNotificationActions = (userId: string, hasUser: boolean, disabledTypes: Set<string>) => {
  const queryClient = useQueryClient();
  const { playSound, showBrowserNotification } = useNotificationSounds();

  // ── Mutations ──
  const markAsRead = useMutation({
    mutationFn: (id: string) => markOneAsRead(id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => markEveryAsRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteRead = useMutation({
    mutationFn: () => deleteReadExcluding(userId, disabledTypes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteOneNotification(id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  // ── Realtime ──
  const playSoundRef = useRef(playSound);
  useEffect(() => { playSoundRef.current = playSound; }, [playSound]);
  const showRef = useRef(showBrowserNotification);
  useEffect(() => { showRef.current = showBrowserNotification; }, [showBrowserNotification]);
  const qcRef = useRef(queryClient);
  useEffect(() => { qcRef.current = queryClient; }, [queryClient]);

  const notifSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    if (!userId) return;
    channel.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      qcRef.current.invalidateQueries({ queryKey: ['notifications', userId] });
      const newNotif = payload.new as AppNotification;
      playSoundRef.current();
      showRef.current({ id: newNotif.id, title: newNotif.title, message: newNotif.message });
    });
  }, [userId]);

  useBfcacheSafeChannel(`notifications-${userId}`, notifSubscribeFn, hasUser && userId.length > 0);

  return { markAsRead, markAllAsRead, deleteRead, deleteOne };
};
