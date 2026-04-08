/**
 * مكون إدارة مهلة الخمول — يفصل منطق idle timeout عن DashboardLayout
 */
import { useCallback, lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useAppSettings } from '@/hooks/data/settings/useAppSettings';
import { useIdleTimeout } from '@/hooks/ui/useIdleTimeout';
import { logAccessEvent } from '@/lib/services/accessLogService';

const IdleTimeoutWarning = lazy(() => import('@/components/auth/IdleTimeoutWarning'));

export default function IdleTimeoutManager() {
  const { user, signOut } = useAuth();
  const { getJsonSetting } = useAppSettings();

  const idleMinutesRaw = getJsonSetting<number>('idle_timeout_minutes', 15);
  const safeIdleMinutes = Math.max(1, Math.min(120, idleMinutesRaw ?? 15));
  const timeoutMs = safeIdleMinutes * 60 * 1000;

  const handleIdleLogout = useCallback(async () => {
    await logAccessEvent({ event_type: 'idle_logout', user_id: user?.id });
    await signOut();
    window.location.href = '/auth?reason=idle';
  }, [signOut, user?.id]);

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
