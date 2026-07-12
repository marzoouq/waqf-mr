/**
 * #DRY — helper موحد للمسارات المحمية
 * يحل تكرار pr() المتطابق في adminRoutes/beneficiaryRoutes
 * مع احترام أن waqifRoutes لا يستخدم RequirePermission
 *
 * يضم أيضاً حارس وضع الصيانة: المستخدمون غير المستثنَين (غير admin/support)
 * يُوجَّهون إلى /maintenance عند تفعيل الوضع.
 */
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import type { AppRole } from '@/types';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RequirePermission from '@/components/auth/RequirePermission';
import { withRouteErrorBoundary as eb } from './withRouteErrorBoundary';
import { useMaintenanceMode } from '@/hooks/application/useMaintenanceMode';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { MAINTENANCE_BYPASS_ROLES } from '@/constants/roles';

/** حارس داخلي — يمرّر الأطفال ما لم يكن وضع الصيانة نشطاً لدور غير مستثنى */
const MaintenanceGuard = ({ children }: { children: ReactNode }) => {
  const { isActive, isLoading } = useMaintenanceMode();
  const { role } = useAuth();
  if (isLoading) return <>{children}</>;
  if (!isActive) return <>{children}</>;
  if (role && (MAINTENANCE_BYPASS_ROLES as AppRole[]).includes(role as AppRole)) {
    return <>{children}</>;
  }
  return <Navigate to="/maintenance" replace />;
};

/**
 * يلف الصفحة بـ ProtectedRoute (+ RequirePermission اختيارياً) + ErrorBoundary
 * @param roles الأدوار المسموح لها
 * @param page عنصر الصفحة
 * @param withPermission افتراضي true (admin/beneficiary) — false لـ waqif/support
 */
export const pr = (
  roles: AppRole[],
  page: ReactNode,
  withPermission = true,
) =>
  eb(
    <ProtectedRoute allowedRoles={roles}>
      <MaintenanceGuard>
        {withPermission ? <RequirePermission>{page}</RequirePermission> : page}
      </MaintenanceGuard>
    </ProtectedRoute>
  );
