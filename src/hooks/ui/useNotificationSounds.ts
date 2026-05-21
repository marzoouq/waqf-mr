/**
 * useNotificationSounds
 *
 * تأثيرات UI/المتصفح للإشعارات الجديدة:
 *  - تشغيل نغمة (AudioContext)
 *  - عرض إشعار متصفح أصلي (window.Notification)
 *
 * مستخرج من `useNotificationActions` لفصل تأثيرات UI/المتصفح عن طبقة
 * data hooks (mutations + realtime). جزء من ضبط boundaries المعمارية.
 */
import { useCallback, useEffect, useRef } from 'react';
import { NOTIFICATION_TONE_KEY, type ToneId, getVolumeGain, playTone } from '@/constants/notificationTones';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { safeGet } from '@/lib/storage';

interface BrowserNotifInput {
  id: string;
  title?: string | null;
  message?: string | null;
}

export const useNotificationSounds = () => {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastNotifIdRef = useRef<string | null>(null);

  // إغلاق AudioContext عند unmount
  useEffect(() => () => { audioCtxRef.current?.close(); }, []);

  const playSound = useCallback(() => {
    try {
      const enabled = safeGet<string>(STORAGE_KEYS.NOTIFICATION_SOUND, 'true') !== 'false';
      if (!enabled) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const tone = safeGet(NOTIFICATION_TONE_KEY, 'chime') as ToneId;
      playTone(audioCtxRef.current, tone, getVolumeGain());
    } catch { /* silent */ }
  }, []);

  const showBrowserNotification = useCallback((notif: BrowserNotifInput) => {
    if (!('Notification' in window) || window.Notification.permission !== 'granted') return;
    if (lastNotifIdRef.current === notif.id) return;
    lastNotifIdRef.current = notif.id;
    try {
      new window.Notification(notif.title || 'إشعار جديد', {
        body: notif.message ?? undefined,
        icon: '/favicon.ico',
        dir: 'rtl',
        lang: 'ar',
        tag: notif.id,
      });
    } catch { /* silent */ }
  }, []);

  return { playSound, showBrowserNotification };
};
