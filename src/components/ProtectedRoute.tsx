/**
 * مكون حماية المسارات (ProtectedRoute)
 * يمنع الوصول للصفحات المحمية بدون تسجيل دخول أو بدون الدور المناسب.
 * - إذا لم يكن مسجلاً: يحول إلى صفحة تسجيل الدخول
 * - إذا لم يملك الدور المطلوب: يحول إلى صفحة "غير مصرح"
 * 
 * @param allowedRoles - الأدوار المسموح لها بالوصول (admin, beneficiary, waqif)
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { logAccessEvent } from '@/hooks/useAccessLog';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'beneficiary' | 'waqif')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  // إذا المستخدم موجود لكن الدور لم يصل بعد = لا تزال حالة تحميل
  const isRoleLoading = !loading && !!user && !!allowedRoles && !role;
  const isUnauthorized = !loading && !!user && !!allowedRoles && !!role && !allowedRoles.includes(role);

  useEffect(() => {
    if (isUnauthorized && !loggedRef.current) {
      loggedRef.current = true;
      logAccessEvent({
        event_type: 'unauthorized_access',
        user_id: user!.id,
        target_path: location.pathname,
        metadata: { current_role: role, required_roles: allowedRoles },
      });
    }
  }, [isUnauthorized, user, role, allowedRoles, location.pathname]);

  if (loading || isRoleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
