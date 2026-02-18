import { useState, useEffect, useCallback } from 'react';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSupported] = useState(() => 'Notification' in window);

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission);
    }
  }, [isSupported]);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') return;
    try {
      new Notification(title, {
        icon: '/favicon.ico',
        dir: 'rtl',
        lang: 'ar',
        ...options,
      });
    } catch {
      // Silent fail for environments that don't support Notification constructor
    }
  }, [isSupported, permission]);

  return { isSupported, permission, requestPermission, showNotification };
};
