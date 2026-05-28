/**
 * مكون إدارة مهلة الخمول وانتهاء الجلسة
 *
 * يجمع مصدرَي خروج تلقائي تحت مسار موحَّد:
 *  1) useIdleTimeout — لا نشاط من المستخدم خلال idle_timeout_minutes
 *  2) useSessionExpiry — JWT انتهى فعلياً (حتى لو كان المستخدم نشطاً ولم يتجدّد)
 *
 * كلاهما يستدعي forceLogout() الذي:
 *  - يسجّل الحدث
 *  - يحاول signOut، ويُنفّذ cleanup يدوياً عند الفشل
 *  - يُعيد التوجيه إلى /auth?reason=idle|session_expired
 */
import { useCallback, useRef, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useAuthCleanup } from '@/hooks/auth/session/useAuthCleanup';
import { useSessionExpiry } from '@/hooks/auth/session/useSessionExpiry';
import { useAccessLogger } from '@/hooks/auth/flows/useAccessLogger';
import { useAppSettings } from '@/hooks/data/settings/app/useAppSettings';
import { useIdleTimeout } from '@/hooks/ui/useIdleTimeout';
import { logger } from '@/lib/logger';

const IdleTimeoutWarning = lazy(() => import('@/components/auth/IdleTimeoutWarning'));

type LogoutReason = 'idle' | 'session_expired';

export default function IdleTimeoutManager() {
  const { user, session, signOut } = useAuth();
  const { performCleanup } = useAuthCleanup();
  const { getJsonSetting } = useAppSettings();
  const logAccess = useAccessLogger();

  // ضمان عدم تنفيذ forceLogout أكثر من مرة (idle + session_expired قد يتسابقان)
  const loggingOutRef = useRef(false);

  const idleMinutesRaw = getJsonSetting<number>('idle_timeout_minutes', 15);
  const safeIdleMinutes = Math.max(1, Math.min(120, idleMinutesRaw ?? 15));
  const timeoutMs = safeIdleMinutes * 60 * 1000;

  const forceLogout = useCallback(
    async (reason: LogoutReason) => {
      if (loggingOutRef.current) return;
      loggingOutRef.current = true;

      logAccess({
        event_type: reason === 'idle' ? 'idle_logout' : 'session_expired',
        user_id: user?.id,
        metadata: { reason },
      });

      try {
        await signOut();
      } catch (err) {
        // ضمان دفاعي: إذا فشل signOut، نُنفّذ التنظيف يدوياً قبل التوجيه
        logger.error(`[IdleTimeoutManager] signOut failed (reason=${reason}), forcing cleanup`, err);
        performCleanup();
      }
      window.location.href = `/auth?reason=${reason}`;
    },
    [signOut, performCleanup, user?.id, logAccess],
  );

  const handleIdleLogout = useCallback(() => {
    void forceLogout('idle');
  }, [forceLogout]);

  const handleSessionExpired = useCallback(() => {
    void forceLogout('session_expired');
  }, [forceLogout]);

  const { showWarning, remaining, stayActive } = useIdleTimeout({
    timeout: timeoutMs,
    warningBefore: 60 * 1000,
    onIdle: handleIdleLogout,
  });

  // كاشف انتهاء الجلسة الحتمي — مستقل عن الخمول
  useSessionExpiry({
    session,
    onExpired: handleSessionExpired,
  });

  if (!user) return null;

  return (
    <Suspense fallback={null}>
      <IdleTimeoutWarning
        open={showWarning}
        remaining={remaining}
        onStayActive={stayActive}
      />
    </Suspense>
  );
}
