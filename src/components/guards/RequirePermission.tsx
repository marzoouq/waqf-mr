/**
 * حارس مسارات — يمنع الوصول المباشر عبر URL إلى أقسام معطّلة
 * الناظر (admin) مُستثنى دائماً
 * إصلاح: لا يتم التوجيه إذا لم يُجلب الدور بعد (role === null)
 */
import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { usePermissionCheck } from '@/hooks/page/usePermissionCheck';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

const RequirePermission = ({ children }: Props) => {
  const { role } = useAuth();
  const location = useLocation();
  const { isRouteAllowed } = usePermissionCheck();

  // إذا لم يُجلب الدور بعد، اعرض المحتوى (ProtectedRoute الأب يتعامل مع هذه الحالة)
  if (!role) return <>{children}</>;

  // الناظر مُستثنى دائماً
  if (role === 'admin') return <>{children}</>;

  // فحص الصلاحيات
  if (!isRouteAllowed(location.pathname)) {
    toast.error('ليس لديك صلاحية للوصول إلى هذا القسم');
    const fallback = role === 'beneficiary' || role === 'waqif' ? '/beneficiary' : '/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
