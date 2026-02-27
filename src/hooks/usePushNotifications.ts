import { useState, useEffect, useCallback } from 'react';

export const usePushNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [isSupported] = useState(() => 'Notification' in window);

  useEffect(() => {
    if (!isSupported) return;
    setPermission(Notification.permission);

    if ('permissions' in navigator) {
      let status: PermissionStatus | null = null;
      const onChange = () => setPermission(Notification.permission);
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then(s => {
        status = s;
        s.addEventListener('change', onChange);
      }).catch(() => { /* unsupported browser */ });
      return () => { status?.removeEventListener('change', onChange); };
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
