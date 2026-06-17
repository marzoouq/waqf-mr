import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ROLE_RESOLUTION_TIMEOUT_MS } from '@/constants/timing';

/** المسارات الافتراضية حسب الدور */
const ROLE_HOME: Record<string, string> = {
  beneficiary: '/beneficiary',
  admin: '/dashboard',
  accountant: '/dashboard',
  waqif: '/waqif',
};

/**
 * يتحقق أن مسار الـ `?from=` آمن (داخلي فقط — لا redirect خارجي).
 * R7 (W2-F18).
 */
function sanitizeFrom(from: string | null): string | null {
  if (!from) return null;
  if (!from.startsWith('/')) return null;
  if (from.startsWith('//')) return null; // protocol-relative
  if (from.startsWith('/auth') || from.startsWith('/unauthorized')) return null;
  return from;
}

/**
 * Hook لإعادة توجيه المستخدم بناءً على دوره بعد تسجيل الدخول.
 * R7 (W2-F18): يستهلك `?from=` إن كان مساراً داخلياً آمناً.
 */
export function useRoleRedirect(
  user: { id: string } | null | undefined,
  role: string | null | undefined,
  loading: boolean
) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [roleWaitTimeout, setRoleWaitTimeout] = useState(false);

  // إعادة توجيه بعد تسجيل الدخول
  useEffect(() => {
    if (loading) return;
    if (!user || !role) return;
    const home = ROLE_HOME[role];
    if (!home) return;
    const from = sanitizeFrom(searchParams.get('from'));
    navigate(from ?? home, { replace: true });
  }, [user, role, loading, navigate, searchParams]);

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
