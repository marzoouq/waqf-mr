/**
 * Guard pour /beneficiary/support
 * - admin/accountant → redirect إلى لوحة دعم الإدارة (/dashboard/support)
 * - beneficiary → عرض الصفحة
 * (waqif محجوب على مستوى المسار)
 */
import { Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

const BeneficiarySupportPage = lazy(() => import('@/pages/beneficiary/SupportPage'));

const SupportPageGuard = () => {
  const { role } = useAuth();

  if (role === 'admin' || role === 'accountant') {
    return <Navigate to="/dashboard/support" replace />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <BeneficiarySupportPage />
    </Suspense>
  );
};

export default SupportPageGuard;
