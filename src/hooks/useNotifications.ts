import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { Notification } from '@/types/database';
import { logger } from '@/lib/logger';

export type { Notification };

export const NOTIFICATION_TONE_KEY = 'waqf_notification_tone';
export const NOTIF_PREFS_KEY = 'waqf_notification_preferences';

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

const playTone = (ctx: AudioContext, tone: ToneId) => {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;

  switch (tone) {
    case 'bell':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.4);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      osc.start(t); osc.stop(t + 0.4);
      break;
    case 'drop':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, t);
      osc.frequency.exponentialRampToValueAtTime(400, t + 0.25);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.start(t); osc.stop(t + 0.25);
      break;
    case 'pulse':
      osc.type = 'square';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.setValueAtTime(800, t + 0.1);
      osc.frequency.setValueAtTime(600, t + 0.2);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
      break;
    case 'gentle':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(520, t);
      osc.frequency.setValueAtTime(660, t + 0.2);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);
      osc.start(t); osc.stop(t + 0.5);
      break;
    default: // chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(830, t);
      osc.frequency.setValueAtTime(1050, t + 0.12);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
  }
};

export const previewTone = (tone: ToneId) => {
  try {
    const ctx = new AudioContext();
    playTone(ctx, tone);
  } catch { /* silent */ }
};

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastNotifIdRef = useRef<string | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playNotificationSound = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      }
      const tone = (localStorage.getItem(NOTIFICATION_TONE_KEY) || 'chime') as ToneId;
      playTone(audioCtxRef.current, tone);
    } catch {
      // Silent fail if audio not supported
    }
  }, []);

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) {
        logger.error('Notifications fetch error:', error);
        throw error;
      }
      return (data || []) as Notification[];
    },
    enabled: !!user,
  });

  const unreadCount = query.data?.filter((n) => !n.is_read).length || 0;

  // Filtered data based on beneficiary notification preferences
  const disabledTypes = useMemo(() => getDisabledTypes(), []);
  const filteredData = useMemo(
    () => query.data?.filter((n) => !disabledTypes.has(n.type)) || [],
    [query.data, disabledTypes]
  );
  const filteredUnreadCount = useMemo(
    () => filteredData.filter((n) => !n.is_read).length,
    [filteredData]
  );

  const markAsRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteRead = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id)
        .eq('is_read', true);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  // Realtime subscription with browser push notifications
  // إصلاح: اسم قناة فريد + فلترة server-side + dependency على user.id فقط
  useEffect(() => {
    if (!user) return;
    const channelName = `notifications-${user.id}`;
    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        
        const newNotif = payload.new as Notification;

        // Play notification chime (if enabled)
        const soundEnabled = localStorage.getItem('waqf_notification_sound') !== 'false';
        if (soundEnabled) playNotificationSound();

        // Show browser push notification
        if ('Notification' in window && Notification.permission === 'granted') {
          if (lastNotifIdRef.current !== newNotif.id) {
            lastNotifIdRef.current = newNotif.id;
            try {
              new Notification(newNotif.title, {
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
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  return { ...query, unreadCount, filteredData, filteredUnreadCount, markAsRead, markAllAsRead, deleteRead, deleteOne };
};
