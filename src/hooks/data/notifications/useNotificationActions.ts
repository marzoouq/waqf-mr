/**
 * هوك mutations و realtime للإشعارات — مستخرج من useNotifications.
 * تأثيرات UI/المتصفح (الصوت + إشعار المتصفح) منفصلة في
 * `@/hooks/ui/useNotificationSounds`.
 */
import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Notification as AppNotification } from '@/types';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { notificationsCrudService } from '@/lib/services/notificationsCrudService';
import { useNotificationSounds } from '@/hooks/ui/useNotificationSounds';

export const useNotificationActions = (userId: string, hasUser: boolean, disabledTypes: Set<string>) => {
  const queryClient = useQueryClient();
  const { playSound, showBrowserNotification } = useNotificationSounds();

  // ── Mutations ──
  const markAsRead = useMutation({
    mutationFn: (id: string) => notificationsCrudService.markAsRead(id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => notificationsCrudService.markAllAsRead(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteRead = useMutation({
    mutationFn: () => notificationsCrudService.deleteRead(userId, disabledTypes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => notificationsCrudService.deleteOne(id, userId),
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
