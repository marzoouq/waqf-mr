/**
 * مكون إدارة مهلة الخمول — يفصل منطق idle timeout عن DashboardLayout
 */
import { useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useAuthCleanup } from '@/hooks/auth/useAuthCleanup';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useIdleTimeout } from '@/hooks/ui/useIdleTimeout';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { logger } from '@/lib/logger';

const IdleTimeoutWarning = lazy(() => import('@/components/auth/IdleTimeoutWarning'));

export default function IdleTimeoutManager() {
  const { user, signOut } = useAuth();
  const { performCleanup } = useAuthCleanup();
  const { getJsonSetting } = useAppSettings();

  const idleMinutesRaw = getJsonSetting<number>('idle_timeout_minutes', 15);
  const safeIdleMinutes = Math.max(1, Math.min(120, idleMinutesRaw ?? 15));
  const timeoutMs = safeIdleMinutes * 60 * 1000;

  const handleIdleLogout = useCallback(async () => {
    await logAccessEvent({ event_type: 'idle_logout', user_id: user?.id });
    try {
      await signOut();
    } catch (err) {
      // ضمان دفاعي: إذا فشل signOut لأي سبب، نُنفّذ التنظيف يدوياً
      // قبل التوجيه إلى صفحة تسجيل الدخول (لا تترك state ملوثاً)
      logger.error('[IdleTimeout] signOut failed, forcing cleanup', err);
      performCleanup();
    }
    window.location.href = '/auth?reason=idle';
  }, [signOut, performCleanup, user?.id]);

  const { showWarning, remaining, stayActive } = useIdleTimeout({
    timeout: timeoutMs,
    warningBefore: 60 * 1000,
    onIdle: handleIdleLogout,
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
