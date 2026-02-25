import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef, useCallback } from 'react';
import type { Notification } from '@/types/database';
import { logger } from '@/lib/logger';

export type { Notification };

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
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Two-tone chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(830, ctx.currentTime);
      osc.frequency.setValueAtTime(1050, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
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

  return { ...query, unreadCount, markAsRead, markAllAsRead, deleteRead, deleteOne };
};
