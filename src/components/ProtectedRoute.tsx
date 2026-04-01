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
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logAccessEvent } from '@/hooks/data/useAccessLog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/lib/logger';
import type { AppRole } from '@/types/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AppRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const loggedRef = useRef(false);
  const [showSignOut, setShowSignOut] = useState(false);

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

  // إصلاح #4: إظهار زر الخروج بعد 3 ثوانٍ + timeout نهائي 10 ثوانٍ للخروج التلقائي
  useEffect(() => {
    if (allowedRoles && !role && !loading && user) {
      const showTimer = setTimeout(() => setShowSignOut(true), 3000);
      const autoLogoutTimer = setTimeout(async () => {
        logger.warn('[ProtectedRoute] role=null timeout after 7s, auto sign-out');
        await signOut();
        navigate('/auth', { replace: true });
      }, 7000);
      return () => {
        clearTimeout(showTimer);
        clearTimeout(autoLogoutTimer);
      };
    }
    setShowSignOut(false);
    return undefined;
  }, [allowedRoles, role, loading, user, signOut, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-40 rounded-lg" />
          <div className="flex gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-7 w-28" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <Skeleton className="h-5 w-32 mb-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-24 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (allowedRoles && !role) {
    logger.warn('[ProtectedRoute] loading=false but role=null');
    return (
      <div className="min-h-screen flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات...</p>
          {showSignOut && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={async () => {
                await signOut();
                navigate('/auth', { replace: true });
              }}
            >
              تسجيل الخروج
            </Button>
          )}
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