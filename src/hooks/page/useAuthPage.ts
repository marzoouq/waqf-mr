import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';

import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { useRegistrationEnabled } from '@/hooks/data/settings/useRegistrationEnabled';

type InstallPromptEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

export const useAuthPage = () => {
  const { signIn, signUp, user, role, loading, signOut } = useAuth();
  const navigate = useNavigate();

  // حالات الواجهة
  const [resetMode, setResetMode] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [roleWaitTimeout, setRoleWaitTimeout] = useState(false);

  // كشف الاتصال بالإنترنت
  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // PWA install prompt
  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as InstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // رسالة تسجيل الخروج بسبب عدم النشاط
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reason') === 'idle') {
      // إشعار الخروج التلقائي مُعطّل — يكفي عرض صفحة تسجيل الدخول
      logAccessEvent({ event_type: 'idle_logout', target_path: '/auth?reason=idle' });
      window.history.replaceState({}, '', '/auth');
    }
  }, []);

  // إعادة توجيه بعد تسجيل الدخول
  useEffect(() => {
    if (loading) return; // انتظار اكتمال التحميل
    if (user && role) {
      if (role === 'beneficiary') {
        navigate('/beneficiary', { replace: true });
      } else if (role === 'admin' || role === 'accountant') {
        navigate('/dashboard', { replace: true });
      } else if (role === 'waqif') {
        navigate('/waqif', { replace: true });
      }
    }
  }, [user, role, loading, navigate]);

  // مهلة انتظار الصلاحيات
  useEffect(() => {
    if (!user || loading || role) {
      setRoleWaitTimeout(false);
      return;
    }
    const timer = setTimeout(() => setRoleWaitTimeout(true), 5000);
    return () => clearTimeout(timer);
  }, [user, role, loading]);

  const { data: registrationEnabled = false } = useRegistrationEnabled();

  // معالجة تثبيت التطبيق
  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((r: { outcome: string }) => {
        if (r.outcome === 'accepted') setIsAppInstalled(true);
        setInstallPrompt(null);
      });
    } else {
      navigate('/install');
    }
  };

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
    navigate,
    handleInstallClick,
  };
};
