import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/useAuthContext';

import { logAccessEvent } from '@/lib/services/accessLogService';
import { useRegistrationEnabled } from '@/hooks/data/settings/useRegistrationEnabled';
import { usePwaInstall } from '@/hooks/ui/usePwaInstall';
import { useOfflineDetect } from '@/hooks/ui/useOfflineDetect';
import { useRoleRedirect } from '@/hooks/ui/useRoleRedirect';

export const useAuthPage = () => {
  const { signIn, signUp, user, role, loading, signOut } = useAuth();

  // hooks مستقلة
  const isOffline = useOfflineDetect();
  const { isAppInstalled, handleInstallClick } = usePwaInstall();
  const { roleWaitTimeout } = useRoleRedirect(user, role, loading);

  // حالات الواجهة
  const [resetMode, setResetMode] = useState(false);

  // رسالة تسجيل الخروج بسبب عدم النشاط
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'idle') {
      logAccessEvent({ event_type: 'idle_logout', target_path: '/auth?reason=idle' });
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  const { data: registrationEnabled = false } = useRegistrationEnabled();

  return {
    // حالات
    resetMode, setResetMode,
    isOffline,
    isAppInstalled,
    roleWaitTimeout,
    registrationEnabled,
    // من AuthContext
    user, role, loading, signIn, signUp, signOut,
    // إجراءات
    handleInstallClick,
  };
};
