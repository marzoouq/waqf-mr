/**
 * حارس مسارات — يمنع الوصول المباشر عبر URL إلى أقسام معطّلة
 * الناظر (admin) مُستثنى دائماً
 */
import { type ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { usePermissionCheck } from '@/hooks/page/usePermissionCheck';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
}

const RequirePermission = ({ children }: Props) => {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { isRouteAllowed } = usePermissionCheck();

  const allowed = role === 'admin' || isRouteAllowed(location.pathname);

  useEffect(() => {
    if (!allowed) {
      toast.error('ليس لديك صلاحية للوصول إلى هذا القسم');
      const fallback = role === 'beneficiary' || role === 'waqif' ? '/beneficiary' : '/dashboard';
      navigate(fallback, { replace: true });
    }
  }, [allowed, navigate, role]);

  if (!allowed) return null;
  return <>{children}</>;
};

export default RequirePermission;
