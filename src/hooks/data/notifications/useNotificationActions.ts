/**
 * هوك mutations و realtime للإشعارات — مستخرج من useNotifications
 */
import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Notification as AppNotification } from '@/types';
import { NOTIFICATION_TONE_KEY, type ToneId, getVolumeGain, playTone } from '@/constants/notificationTones';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeGet } from '@/lib/storage';

export const useNotificationActions = (userId: string, hasUser: boolean, disabledTypes: Set<string>) => {
  const queryClient = useQueryClient();
  const lastNotifIdRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const tone = safeGet(NOTIFICATION_TONE_KEY, 'chime') as ToneId;
      playTone(audioCtxRef.current, tone, getVolumeGain());
    } catch { /* silent */ }
  }, []);

  useEffect(() => () => { audioCtxRef.current?.close(); }, []);

  // ── Mutations ──
  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteRead = useMutation({
    mutationFn: async () => {
      let query = supabase.from('notifications').delete().eq('user_id', userId).eq('is_read', true);
      if (disabledTypes.size > 0) {
        const typesArray = [...disabledTypes];
        query = query.not('type', 'in', `("${typesArray.join('","')}")`);
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  // ── Realtime ──
  const playSoundRef = useRef(playNotificationSound);
  useEffect(() => { playSoundRef.current = playNotificationSound; }, [playNotificationSound]);
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
      const soundEnabled = safeGet<string>(STORAGE_KEYS.NOTIFICATION_SOUND, 'true') !== 'false';
      if (soundEnabled) playSoundRef.current();
      if ('Notification' in window && window.Notification.permission === 'granted') {
        if (lastNotifIdRef.current !== newNotif.id) {
          lastNotifIdRef.current = newNotif.id;
          try {
            new window.Notification(newNotif.title || 'إشعار جديد', {
              body: newNotif.message, icon: '/favicon.ico', dir: 'rtl', lang: 'ar', tag: newNotif.id,
            });
          } catch { /* silent */ }
        }
      }
    });
  }, [userId]);

  useBfcacheSafeChannel(`notifications-${userId}`, notifSubscribeFn, hasUser && userId.length > 0);

  return { markAsRead, markAllAsRead, deleteRead, deleteOne };
};
