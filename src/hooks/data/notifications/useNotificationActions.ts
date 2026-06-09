/**
 * هوك mutations و realtime للإشعارات — مستخرج من useNotifications.
 * تأثيرات UI/المتصفح (الصوت + إشعار المتصفح) منفصلة في
 * `@/hooks/ui/useNotificationSounds`.
 *
 * Optimistic updates + rollback + uiNotify.error عند فشل الشبكة
 * — يمنع سيناريو "ضغطت قراءة الكل ثم أُغلق التطبيق فلم تُحفظ".
 */
import { useEffect, useRef, useCallback } from 'react';
import { useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import { uiNotify } from '@/lib/notify';
import type { Notification as AppNotification } from '@/types';
import { useBfcacheSafeChannel } from '@/lib/realtime/bfcacheSafeChannel';
import { supabase } from '@/integrations/supabase/client';
import { useNotificationSounds } from '@/hooks/ui/useNotificationSounds';
import { logger } from '@/lib/logger';
import { notificationsKeys } from '@/lib/queryKeys/notificationsKeys';

type NotifPages = InfiniteData<AppNotification[]>;

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
  const queryKey = ['notifications', userId] as const;

  const snapshot = (): NotifPages | undefined => queryClient.getQueryData<NotifPages>(queryKey);

  const setPages = (updater: (pages: AppNotification[][]) => AppNotification[][]) => {
    queryClient.setQueryData<NotifPages>(queryKey, (prev) => {
      if (!prev) return prev;
      return { ...prev, pages: updater(prev.pages) };
    });
  };

  // ── Mutations مع Optimistic + Rollback + Toast ──
  const markAsRead = useMutation({
    mutationFn: (id: string) => markOneAsRead(id, userId),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = snapshot();
      setPages((pages) => pages.map((p) => p.map((n) => (n.id === id ? { ...n, is_read: true } : n))));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      logger.error('markAsRead failed:', err);
      uiNotify.error('تعذّر تحديث حالة الإشعار');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const markAllAsRead = useMutation({
    mutationFn: () => markEveryAsRead(userId),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = snapshot();
      setPages((pages) => pages.map((p) => p.map((n) => (n.is_read ? n : { ...n, is_read: true }))));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      logger.error('markAllAsRead failed:', err);
      uiNotify.error('تعذّر تحديث حالة الإشعارات');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteRead = useMutation({
    mutationFn: () => deleteReadExcluding(userId, disabledTypes),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const prev = snapshot();
      setPages((pages) => pages.map((p) => p.filter((n) => !n.is_read || disabledTypes.has(n.type))));
      return { prev };
    },
    onError: (err, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      logger.error('deleteRead failed:', err);
      uiNotify.error('تعذّر حذف الإشعارات المقروءة');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => deleteOneNotification(id, userId),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const prev = snapshot();
      setPages((pages) => pages.map((p) => p.filter((n) => n.id !== id)));
      return { prev };
    },
    onError: (err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev);
      logger.error('deleteOne failed:', err);
      uiNotify.error('تعذّر حذف الإشعار');
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
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
      qcRef.current.invalidateQueries({ queryKey: notificationsKeys.byUser(userId) });
      const newNotif = payload.new as AppNotification;
      playSoundRef.current();
      showRef.current({ id: newNotif.id, title: newNotif.title, message: newNotif.message });
    });
  }, [userId]);

  useBfcacheSafeChannel(`notifications-${userId}`, notifSubscribeFn, hasUser && userId.length > 0);

  return { markAsRead, markAllAsRead, deleteRead, deleteOne };
};
