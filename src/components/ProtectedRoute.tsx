/**
 * مكون حماية المسارات (ProtectedRoute)
 * يمنع الوصول للصفحات المحمية بدون تسجيل دخول أو بدون الدور المناسب.
 * 
 * إصلاح: إضافة timeout لحالة isRoleLoading لمنع التعليق اللانهائي
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { supabase } from '@/integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'beneficiary' | 'waqif')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);
  const [roleTimeout, setRoleTimeout] = useState(false);
  const [lastChanceRole, setLastChanceRole] = useState<string | null>(null);

  const effectiveRole = lastChanceRole || role;
  const isRoleLoading = !loading && !!user && !!allowedRoles && !effectiveRole;
  const isUnauthorized = !loading && !!user && !!allowedRoles && !!effectiveRole && !allowedRoles.includes(effectiveRole as any);

  // Timeout: 5s max waiting for role, then try one last direct fetch
  useEffect(() => {
    if (!isRoleLoading) {
      setRoleTimeout(false);
      return;
    }

    const timer = setTimeout(async () => {
      console.warn('[ProtectedRoute] Role loading timeout after 3s, attempting direct fetch...');
      try {
        const { data } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user!.id)
          .maybeSingle();

        if (data?.role) {
          console.warn('[ProtectedRoute] Last-chance fetch succeeded:', data.role);
          setLastChanceRole(data.role);
          return;
        }
      } catch (err) {
        console.error('[ProtectedRoute] Last-chance fetch failed:', err);
      }
      setRoleTimeout(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, [isRoleLoading, user]);

  useEffect(() => {
    if (isUnauthorized && !loggedRef.current) {
      loggedRef.current = true;
      logAccessEvent({
        event_type: 'unauthorized_access',
        user_id: user!.id,
        target_path: location.pathname,
        metadata: { current_role: effectiveRole, required_roles: allowedRoles },
      });
    }
  }, [isUnauthorized, user, effectiveRole, allowedRoles, location.pathname]);

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

  // Role still loading (within 5s window)
  if (isRoleLoading && !roleTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Timeout expired and no role found → redirect to auth
  if (roleTimeout && !effectiveRole) {
    console.warn('[ProtectedRoute] Redirecting to /auth due to role timeout');
    return <Navigate to="/auth" replace />;
  }

  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
