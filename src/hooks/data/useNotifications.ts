import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import type { Notification } from '@/types/database';
import { logger } from '@/lib/logger';
import { useBfcacheSafeChannel } from '@/hooks/ui/useBfcacheSafeChannel';

export type { Notification };

export const NOTIFICATION_TONE_KEY = 'waqf_notification_tone';
export const NOTIFICATION_VOLUME_KEY = 'waqf_notification_volume';
export const NOTIF_PREFS_KEY = 'waqf_notification_preferences';

export type VolumeLevel = 'high' | 'medium' | 'low';
export const VOLUME_OPTIONS: { id: VolumeLevel; label: string; gain: number }[] = [
  { id: 'high', label: 'مرتفع', gain: 1.0 },
  { id: 'medium', label: 'متوسط', gain: 0.5 },
  { id: 'low', label: 'منخفض', gain: 0.15 },
];

const getVolumeGain = (): number => {
  try {
    const level = (localStorage.getItem(NOTIFICATION_VOLUME_KEY) || 'medium') as VolumeLevel;
    return VOLUME_OPTIONS.find(v => v.id === level)?.gain ?? 0.5;
  } catch { return 0.5; }
};

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

export type ToneId = 'chime' | 'bell' | 'drop' | 'pulse' | 'gentle';

export interface ToneOption {
  id: ToneId;
  label: string;
}

export const TONE_OPTIONS: ToneOption[] = [
  { id: 'chime', label: 'رنين كلاسيكي' },
  { id: 'bell', label: 'جرس' },
  { id: 'drop', label: 'قطرة ماء' },
  { id: 'pulse', label: 'نبضة' },
  { id: 'gentle', label: 'هادئ' },
];

const playTone = (ctx: AudioContext, tone: ToneId, volumeMultiplier = 1.0) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  const v = volumeMultiplier;

  switch (tone) {
    case 'bell':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);
      gain.gain.setValueAtTime(0.18 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
      break;
    case 'drop':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
      gain.gain.setValueAtTime(0.12 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
      break;
    case 'pulse':
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(800, t + 0.1);
      osc.frequency.setValueAtTime(600, t + 0.2);
      gain.gain.setValueAtTime(0.08 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
      break;
    case 'gentle':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.setValueAtTime(660, t + 0.2);
      gain.gain.setValueAtTime(0.1 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
      break;
    default: // chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(830, t);
      osc.frequency.setValueAtTime(1050, t + 0.12);
      gain.gain.setValueAtTime(0.15 * v, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
  }
};

export const previewTone = (tone: ToneId, volumeOverride?: number) => {
  try {
    const ctx = new AudioContext();
    const vol = volumeOverride ?? getVolumeGain();
    playTone(ctx, tone, vol);
  } catch { /* silent */ }
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

  // #46: الاستماع لتغييرات localStorage — يعمل من نفس النافذة وعبر النوافذ
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

  // #52: تحويل إلى useInfiniteQuery مع cursor-based pagination
  const infiniteQuery = useInfiniteQuery({
    queryKey: ['notifications', userId],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let query = supabase
        .from('notifications')
        .select('id, title, message, type, is_read, link, created_at, user_id')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE);

      // cursor: جلب الإشعارات الأقدم من آخر created_at
      if (pageParam) {
        query = query.lt('created_at', pageParam);
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
      return lastPage[lastPage.length - 1]?.created_at;
    },
    enabled: !!user && userId.length > 0,
  });

  // تجميع كل الصفحات في مصفوفة واحدة
  const allNotifications = useMemo(
    () => (infiniteQuery.data?.pages ?? []).flat(),
    [infiniteQuery.data]
  );

  const unreadCount = useMemo(
    () => allNotifications.filter((n) => !n.is_read).length,
    [allNotifications]
  );

  // Filtered data based on beneficiary notification preferences
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
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications', userId] }),
  });

  // Stable refs to avoid re-subscribing on callback/queryClient changes
  const playSoundRef = useRef(playNotificationSound);
  useEffect(() => { playSoundRef.current = playNotificationSound; }, [playNotificationSound]);
  const qcRef = useRef(queryClient);
  useEffect(() => { qcRef.current = queryClient; }, [queryClient]);

  // Realtime subscription with browser push notifications — bfcache safe
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
    // بيانات متوافقة مع الاستخدام السابق
    data: allNotifications,
    isLoading: infiniteQuery.isLoading,
    isError: infiniteQuery.isError,
    error: infiniteQuery.error,
    // #52: تحميل المزيد
    hasNextPage: infiniteQuery.hasNextPage,
    fetchNextPage: infiniteQuery.fetchNextPage,
    isFetchingNextPage: infiniteQuery.isFetchingNextPage,
    // إحصائيات
    unreadCount,
    filteredData,
    filteredUnreadCount,
    // mutations
    markAsRead,
    markAllAsRead,
    deleteRead,
    deleteOne,
  };
};
