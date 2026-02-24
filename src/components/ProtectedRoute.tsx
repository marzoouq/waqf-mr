/**
 * مكون حماية المسارات — نسخة مبسّطة
 * يعتمد كليًا على AuthContext. AuthContext يتكفل بالـ timeout والـ retries.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { logger } from '@/lib/logger';

type AllowedRole = 'admin' | 'beneficiary' | 'waqif' | 'accountant';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRole[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();
  const loggedRef = useRef(false);

  const isUnauthorized =
    !loading &&
    !!user &&
    !!allowedRoles &&
    !!role &&
    !allowedRoles.includes(role as AllowedRole);

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

  if (allowedRoles && !role) {
    logger.warn('[ProtectedRoute] Waiting for role from AuthContext...');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isUnauthorized) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;