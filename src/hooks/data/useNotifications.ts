import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import type { Notification } from '@/types/database';
import { logger } from '@/lib/logger';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';
import {
  NOTIFICATION_TONE_KEY, NOTIF_PREFS_KEY,
  type ToneId, getVolumeGain, playTone,
} from '@/constants/notificationTones';

// إعادة تصدير للتوافق مع الاستيرادات الحالية
export type { Notification };
export {
  NOTIFICATION_TONE_KEY, NOTIFICATION_VOLUME_KEY, NOTIF_PREFS_KEY,
} from '@/constants/notificationTones';
export type { VolumeLevel, ToneId, ToneOption } from '@/constants/notificationTones';
export { VOLUME_OPTIONS, TONE_OPTIONS, previewTone } from '@/constants/notificationTones';

/** Maps beneficiary preference keys to notification types */
const PREF_TYPE_MAP: Record<string, string> = {
  distributions: 'payment',
  contracts: 'warning',
  messages: 'message',
};

/** Returns set of notification types disabled by beneficiary prefs */
const getDisabledTypes = (): Set<string> => {
  try {
    const stored = localStorage.getItem(NOTIF_PREFS_KEY);
    if (!stored) return new Set();
    const prefs = JSON.parse(stored);
    const disabled = new Set<string>();
    for (const [prefKey, notifType] of Object.entries(PREF_TYPE_MAP)) {
      if (prefs[prefKey] === false) disabled.add(notifType);
    }
    return disabled;
  } catch {
    return new Set();
  }
};

const PAGE_SIZE = 50;

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastNotifIdRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [disabledTypes, setDisabledTypes] = useState<Set<string>>(() => getDisabledTypes());

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const tone = (localStorage.getItem(NOTIFICATION_TONE_KEY) || 'chime') as ToneId;
      const vol = getVolumeGain();
      playTone(audioCtxRef.current, tone, vol);
    } catch {
      // Silent fail if audio not supported
    }
  }, []);

  // Cleanup AudioContext on unmount
  useEffect(() => {
    return () => { audioCtxRef.current?.close(); };
  }, []);

  // #46: الاستماع لتغييرات localStorage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === NOTIF_PREFS_KEY) setDisabledTypes(getDisabledTypes());
    };
    const handleCustom = () => setDisabledTypes(getDisabledTypes());
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('notif-prefs-changed', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('notif-prefs-changed', handleCustom);
    };
  }, []);

  const userId = user?.id ?? '';

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['notifications', userId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let query = supabase
        .from('notifications')
        .select('id, title, message, type, is_read, link, created_at, user_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      if (pageParam) {
        const [cursorTs, cursorId] = pageParam.split('|');
        query = query.or(`created_at.lt.${cursorTs},and(created_at.eq.${cursorTs},id.lt.${cursorId})`);
      }

      const { data, error } = await query;
      if (error) {
        logger.error('Notifications fetch error:', error);
        throw error;
      }
      return (data || []) as Notification[];
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      const last = lastPage[lastPage.length - 1];
      if (!last) return undefined;
      return `${last.created_at}|${last.id}`;
    },
    enabled: !!user && userId.length > 0,
  });

  const allNotifications = useMemo(
    () => (infiniteQuery.data?.pages ?? []).flat(),
    [infiniteQuery.data]
  );

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.is_read).length,
    [allNotifications]
  );

  const filteredData = useMemo(
    () => allNotifications.filter((n) => !disabledTypes.has(n.type)),
    [allNotifications, disabledTypes]
  );
  const filteredUnreadCount = useMemo(
    () => filteredData.filter((n) => !n.is_read).length,
    [filteredData]
  );

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      let query = supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);
      if (disabledTypes.size > 0) {
        query = query.not('type', 'in', `(${[...disabledTypes].join(',')})`);
      }
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  // Stable refs
  const playSoundRef = useRef(playNotificationSound);
  useEffect(() => { playSoundRef.current = playNotificationSound; }, [playNotificationSound]);
  const qcRef = useRef(queryClient);
  useEffect(() => { qcRef.current = queryClient; }, [queryClient]);

  // Realtime subscription — bfcache safe
  const notifSubscribeFn = useCallback((channel: import('@supabase/supabase-js').RealtimeChannel) => {
    if (!userId) return;
    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, (payload) => {
      qcRef.current.invalidateQueries({ queryKey: ['notifications', userId] });
      
      const newNotif = payload.new as Notification;

      let soundEnabled = true;
      try { soundEnabled = localStorage.getItem('waqf_notification_sound') !== 'false'; } catch { /* safe default */ }
      if (soundEnabled) playSoundRef.current();

      if ('Notification' in window && window.Notification.permission === 'granted') {
        if (lastNotifIdRef.current !== newNotif.id) {
          lastNotifIdRef.current = newNotif.id;
          try {
            new window.Notification(newNotif.title, {
              body: newNotif.message,
              icon: '/favicon.ico',
              dir: 'rtl',
              lang: 'ar',
              tag: newNotif.id,
            });
          } catch {
            // Silent fail
          }
        }
      }
    });
  }, [userId]);

  useBfcacheSafeChannel(`notifications-${userId}`, notifSubscribeFn, !!user && userId.length > 0);

  return {
    data: allNotifications,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    unreadCount,
    filteredData,
    filteredUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteRead,
    deleteOne,
  };
};
