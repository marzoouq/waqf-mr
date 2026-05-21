/**
 * حارس مسارات — يمنع الوصول المباشر عبر URL إلى أقسام معطّلة
 * الناظر (admin) مُستثنى دائماً (قاعدة مشروع موثّقة)
 * إصلاح: لا يتم التوجيه إذا لم يُجلب الدور بعد (role === null)
 * إصلاح D-01: نقل side-effect (uiNotify) من render إلى useEffect لمنع تكرار Toast
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { usePermissionCheck } from '@/hooks/application/usePermissionCheck';
import { uiNotify } from '@/lib/notify';

interface Props {
  children: ReactNode;
}

const RequirePermission = ({ children }: Props) => {
  const { role } = useAuth();
  const location = useLocation();
  const { isRouteAllowed } = usePermissionCheck();
  const notifiedRef = useRef<string | null>(null);

  const denied = Boolean(role) && role !== 'admin' && !isRouteAllowed(location.pathname);

  useEffect(() => {
    if (denied && notifiedRef.current !== location.pathname) {
      uiNotify.error('ليس لديك صلاحية للوصول إلى هذا القسم');
      notifiedRef.current = location.pathname;
    }
  }, [denied, location.pathname]);

  // إذا لم يُجلب الدور بعد، اعرض المحتوى (ProtectedRoute الأب يتعامل مع هذه الحالة)
  if (!role) return <>{children}</>;

  // الناظر مُستثنى دائماً
  if (role === 'admin') return <>{children}</>;

  if (denied) {
    const fallback = role === 'beneficiary' || role === 'waqif' ? '/beneficiary' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
