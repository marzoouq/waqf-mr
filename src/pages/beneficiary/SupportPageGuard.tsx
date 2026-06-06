/**
 * Guard pour /beneficiary/support
 * - admin/accountant → redirect إلى لوحة دعم الإدارة (/dashboard/support) مع toast
 * - beneficiary → عرض الصفحة
 * (waqif محجوب على مستوى المسار)
 *
 * H21: نستخدم navigate() داخل effect ونعرض Loader بدل <Navigate/> أثناء render
 * كي يبقى المكوّن مُركّباً بما يكفي ليُلتقط toast قبل التحويل.
 */
import { Suspense, lazy, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { uiNotify } from '@/lib/notify';
import { useAuth } from '@/hooks/auth/session/useAuthContext';

const BeneficiarySupportPage = lazy(() => import('@/pages/beneficiary/SupportPage'));

const SupportPageGuard = () => {
  const { role } = useAuth();
  const navigate = useNavigate();
  const shouldRedirect = role === 'admin' || role === 'accountant';

  useEffect(() => {
    if (shouldRedirect) {
      uiNotify.info('تم تحويلك إلى لوحة دعم الإدارة');
      navigate('/dashboard/support', { replace: true });
    }
  }, [shouldRedirect, navigate]);

  if (shouldRedirect) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
