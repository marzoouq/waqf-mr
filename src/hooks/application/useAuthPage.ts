import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

import { logAccessEvent } from '@/lib/services/accessLogService';
import { useRegistrationEnabled } from '@/hooks/data/settings/permissions/useRegistrationEnabled';
import { useSetting } from '@/hooks/data/settings/app/useAppSettings';
import { usePwaInstall } from '@/hooks/ui/usePwaInstall';
import { useOfflineDetect } from '@/hooks/ui/useOfflineDetect';
import { useRoleRedirect } from '@/hooks/auth/role/useRoleRedirect';

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
  const waqfLogoUrl = useSetting('waqf_logo_url');

  return {
    // حالات
    resetMode, setResetMode,
    isOffline,
    isAppInstalled,
    roleWaitTimeout,
    registrationEnabled,
    waqfLogoUrl,
    // من AuthContext
    user, role, loading, signIn, signUp, signOut,
    // إجراءات
    handleInstallClick,
  };
};
