/**
 * Guard pour /beneficiary/support
 * - admin/accountant → redirect إلى لوحة دعم الإدارة (/dashboard/support) مع toast
 * - beneficiary → عرض الصفحة
 * (waqif محجوب على مستوى المسار)
 */
import { Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { uiNotify } from '@/lib/notify';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

const BeneficiarySupportPage = lazy(() => import('@/pages/beneficiary/SupportPage'));

const RedirectWithToast = () => {
  useEffect(() => {
    uiNotify.info('تم تحويلك إلى لوحة دعم الإدارة');
  }, []);
  return <Navigate to="/dashboard/support" replace />;
};

const SupportPageGuard = () => {
  const { role } = useAuth();

  if (role === 'admin' || role === 'accountant') {
    return <RedirectWithToast />;
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
