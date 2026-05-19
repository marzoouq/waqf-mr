import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROLE_RESOLUTION_TIMEOUT_MS } from '@/constants/timing';

/**
 * Hook لإعادة توجيه المستخدم بناءً على دوره بعد تسجيل الدخول
 */
export function useRoleRedirect(
  user: { id: string } | null | undefined,
  role: string | null | undefined,
  loading: boolean
) {
  const navigate = useNavigate();
  const [roleWaitTimeout, setRoleWaitTimeout] = useState(false);

  // إعادة توجيه بعد تسجيل الدخول
  useEffect(() => {
    if (loading) return;
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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset timeout flag when state preconditions change
      setRoleWaitTimeout(false);
      return;
    }
    const timer = setTimeout(() => setRoleWaitTimeout(true), ROLE_RESOLUTION_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [user, role, loading]);

  return { roleWaitTimeout };
}
