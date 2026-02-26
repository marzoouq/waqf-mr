/**
 * مكون حماية المسارات
 * يمنع الوصول للصفحات المحمية بدون تسجيل دخول أو بدون الدور المناسب.
 * يعتمد بالكامل على AuthContext لمنطق المصادقة وتسجيل الخروج.
 *
 * إصلاح #1: توحيد الـ interface وحذف الكود المكرر الناتج عن merge فاشل
 * إصلاح #2: حذف الكتلة if(allowedRoles && !role) المكررة وغير المنطقية
 * إصلاح #3: حذف استدعاء supabase.auth.signOut() المباشر المكرر (Double Logout)
 * إصلاح #9: إعادة ضبط loggedRef عند تغيير المسار لضمان تسجيل كل حدث وصول غير مصرح
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading, signOut } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  // إصلاح #9: إعادة ضبط loggedRef عند تغيير المسار
  useEffect(() => {
    loggedRef.current = false;
  }, [location.pathname]);

  // إصلاح #1: تعبير موحد نظيف باستخدام AppRole فقط
  const isUnauthorized =
    !loading &&
    !!user &&
    !!allowedRoles &&
    !!role &&
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // إصلاح #2: كتلة واحدة نظيفة (loading=false مضمون هنا)
  if (allowedRoles && !role) {
    logger.warn('[ProtectedRoute] loading=false but role=null');
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
          {/* إصلاح #3: signOut() فقط، يستدعي supabase.auth.signOut() داخلياً */}
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

  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;