/**
 * usePageActivityTracker — تتبع دقيق لتحركات المستخدم داخل التطبيق.
 *
 * يسجّل:
 *  - page_view عند الدخول لكل مسار (مع اسم القسم والصفحة)
 *  - page_exit عند مغادرة المسار أو إغلاق التبويب (مع مدة البقاء بالثواني)
 *
 * يعمل فقط للمستخدمين المسجّلين، ويستخدم معرّف جلسة ثابت لكل تبويب.
 */
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { resolveClientContext } from '@/lib/monitoring/clientContext';
import { ALL_ROUTES } from '@/constants/routeRegistry';

/** اسم الصفحة العربي إن كان المسار مسجّلاً */
const labelForPath = (path: string): string => {
  const exact = ALL_ROUTES[path];
  if (exact?.title) return exact.title;
  const match = Object.keys(ALL_ROUTES)
    .filter((p) => p !== '/' && path.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  return match ? (ALL_ROUTES[match]?.title ?? path) : path;
};

export const usePageActivityTracker = (): null => {
  const { user } = useAuth();
  const location = useLocation();
  const enteredAtRef = useRef<number>(Date.now());
  const pathRef = useRef<string>(location.pathname);

  // جلب عنوان IP مرة واحدة لكل جلسة (يُرفق تلقائياً بكل حدث لاحق)
  useEffect(() => {
    if (!user) return;
    void resolveClientContext();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const path = location.pathname;
    const label = labelForPath(path);
    enteredAtRef.current = Date.now();
    pathRef.current = path;

    void logAccessEvent({
      event_type: 'page_view',
      user_id: user.id,
      email: user.email ?? undefined,
      target_path: path,
      metadata: {
        label,
        search: location.search || undefined,
        referrer: document.referrer || undefined,
        viewport: `${window.innerWidth}x${window.innerHeight}`,
      },
    });

    const logExit = () => {
      const seconds = Math.round((Date.now() - enteredAtRef.current) / 1000);
      if (seconds < 1) return;
      void logAccessEvent({
        event_type: 'page_exit',
        user_id: user.id,
        email: user.email ?? undefined,
        target_path: pathRef.current,
        metadata: { label, duration_seconds: seconds },
      });
    };

    const onHidden = () => {
      if (document.visibilityState === 'hidden') logExit();
    };
    document.addEventListener('visibilitychange', onHidden);

    return () => {
      document.removeEventListener('visibilitychange', onHidden);
      logExit();
    };
  }, [user, location.pathname, location.search]);

  return null;
};
