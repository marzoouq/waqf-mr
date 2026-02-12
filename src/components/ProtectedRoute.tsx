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

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('admin' | 'beneficiary' | 'waqif')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  const location = useLocation();

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

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
