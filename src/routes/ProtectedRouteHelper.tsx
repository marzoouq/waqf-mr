/**
 * #DRY — helper موحد للمسارات المحمية
 * يحل تكرار pr() المتطابق في adminRoutes/beneficiaryRoutes
 * مع احترام أن waqifRoutes لا يستخدم RequirePermission
 */
import type { ReactNode } from 'react';
import type { AppRole } from '@/types';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import RequirePermission from '@/components/auth/RequirePermission';
import { withRouteErrorBoundary as eb } from './withRouteErrorBoundary';

/**
 * يلف الصفحة بـ ProtectedRoute (+ RequirePermission اختيارياً) + ErrorBoundary
 * @param roles الأدوار المسموح لها
 * @param page عنصر الصفحة
 * @param withPermission افتراضي true (admin/beneficiary) — false لـ waqif
 */
export const pr = (
  roles: AppRole[],
  page: ReactNode,
  withPermission = true,
) =>
  eb(
    <ProtectedRoute allowedRoles={roles}>
      {withPermission ? <RequirePermission>{page}</RequirePermission> : page}
    </ProtectedRoute>
  );
