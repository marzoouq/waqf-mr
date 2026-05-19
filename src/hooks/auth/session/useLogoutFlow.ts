/**
 * هوك تدفق تسجيل الخروج — يفصل منطق الأعمال عن حالة التخطيط (UI)
 * يحتوي: تسجيل حدث الوصول + signOut + التوجيه إلى /auth
 */
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { logAccessEvent } from '@/lib/services/accessLogService';

export function useLogoutFlow() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const performLogout = useCallback(async () => {
    await logAccessEvent({ event_type: 'logout', user_id: user?.id }).catch(() => {});
    try {
      await signOut();
    } finally {
      navigate('/auth', { replace: true });
    }
  }, [navigate, signOut, user?.id]);

  return { performLogout };
}
