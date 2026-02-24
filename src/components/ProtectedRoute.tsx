/**
 * مكون حماية المسارات (ProtectedRoute)
 * يمنع الوصول للصفحات المحمية بدون تسجيل دخول أو بدون الدور المناسب.
 * يعتمد بالكامل على AuthContext لمنطق المصادقة وتسجيل الخروج.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { Button } from '@/components/ui/button';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading, signOut } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  const isUnauthorized =
    !loading && !!user && !!allowedRoles && !!role &&
    !allowedRoles.includes(role as AppRole);

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

  // 1. جلب بيانات المصادقة
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. غير مسجّل
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 3. مسجّل لكن الدور لم يُجلب بعد
  // إذا انتهى التحميل ولا يوجد دور → إعادة توجيه لتسجيل الدخول بدل حلقة تحميل لا نهائية
  if (allowedRoles && !role) {
    if (!loading) {
      return <Navigate to="/auth" state={{ from: location }} replace />;
    }
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={async () => {
              await signOut();
              window.location.href = '/auth';
            }}
          >
            تسجيل الخروج
          </Button>
        </div>
      </div>
    );
  }

  // 4. دور غير مصرح
  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
