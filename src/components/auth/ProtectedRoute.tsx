/**
 * مكون حماية المسارات — مُبسَّط
 * الدور يُقرأ من JWT فوراً، لذا لا حاجة لمؤقتات أو حلقات انتظار.
 * Fallback قصير فقط إذا كان الدور غير متاح بعد (حالة نادرة).
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { logAccessEvent } from '@/lib/services/accessLogService';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  // إعادة ضبط loggedRef عند تغيير المسار
  useEffect(() => {
    loggedRef.current = false;
  }, [location.pathname]);

  const isUnauthorized =
    !loading && !!user && !!allowedRoles && !!role && !allowedRoles.includes(role as AppRole);

  // تسجيل محاولات الوصول غير المصرح بها
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

  // جاري التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // غير مسجّل الدخول
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // الدور غير متاح بعد (حالة نادرة: تسجيل أول قبل تشغيل trigger)
  if (allowedRoles && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // غير مصرّح
  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
