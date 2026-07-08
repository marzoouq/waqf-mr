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
export function sanitizeFrom(from: string | null): string | null {
  if (!from) return null;
  if (!from.startsWith('/')) return null;
  if (from.startsWith('//')) return null; // protocol-relative
  if (from.startsWith('/auth') || from.startsWith('/unauthorized')) return null;
  return from;
}

/**
 * يتحقق أن مسار `from` يطابق منطقة دور المستخدم.
 * يمنع توجيه المستفيد لمسار الناظر بعد تسجيل دخول ناجح.
 */
export function isFromAllowedForRole(from: string, role: string): boolean {
  // مسار موافقة OAuth (MCP) متاح لأي دور موثّق
  if (from.startsWith('/.lovable/oauth/consent')) return true;
  if (role === 'admin') return from.startsWith('/dashboard') || from.startsWith('/beneficiary');
  if (role === 'accountant') return from.startsWith('/dashboard');
  if (role === 'beneficiary') return from.startsWith('/beneficiary');
  if (role === 'waqif') return from.startsWith('/waqif');
  return false;
}

/**
 * Hook لإعادة توجيه المستخدم بناءً على دوره بعد تسجيل الدخول.
 * R7 (W2-F18): يستهلك `?from=` إن كان مساراً داخلياً آمناً ومناسباً للدور.
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
    const sanitized = sanitizeFrom(searchParams.get('from'));
    const from = sanitized && isFromAllowedForRole(sanitized, role) ? sanitized : null;
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
