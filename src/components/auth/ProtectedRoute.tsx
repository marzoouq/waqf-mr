/**
 * مكون حماية المسارات — مُبسَّط
 * الدور يُقرأ من JWT فوراً، لذا لا حاجة لمؤقتات أو حلقات انتظار.
 *
 * سلوك إعادة التوجيه موحَّد لكل الأدوار:
 *  - بدون جلسة → /auth?from=<path>
 *  - بجلسة وبدون الدور المسموح → /unauthorized
 *  - فقدان الدور بعد signup (نادر، قبل تشغيل trigger) → loader وليس redirect
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useAccessLogger } from '@/hooks/auth/flows/useAccessLogger';
import type { AppRole } from '@/types';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const logAccess = useAccessLogger();
  const loggedRef = useRef(false);
  const isMountedRef = useRef(true);

  // إعادة ضبط loggedRef عند تغيير المسار — نسجّل كل محاولة وصول جديدة مرة واحدة
  useEffect(() => {
    loggedRef.current = false;
  }, [location.pathname]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const isUnauthorized =
    !loading && !!user && !!allowedRoles && !!role && !allowedRoles.includes(role as AppRole);

  // تسجيل محاولات الوصول غير المصرح بها (مرة واحدة لكل مسار)
  useEffect(() => {
    if (isUnauthorized && !loggedRef.current && isMountedRef.current) {
      loggedRef.current = true;
      logAccess({
        event_type: 'unauthorized_access',
        user_id: user!.id,
        target_path: location.pathname,
        metadata: { current_role: role, required_roles: allowedRoles },
      });
    }
  }, [isUnauthorized, user, role, allowedRoles, location.pathname, logAccess]);

  // جاري التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // غير مسجّل الدخول — توجيه موحّد مع حفظ المسار المقصود
  if (!user) {
    const from = location.pathname + location.search;
    return <Navigate to={`/auth?from=${encodeURIComponent(from)}`} state={{ from: location }} replace />;
  }

  // الدور غير متاح بعد (حالة نادرة: signup قبل تشغيل trigger)
  if (allowedRoles && !role) {
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // غير مصرّح — نفس المسار لكل الأدوار
  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
