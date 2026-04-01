/**
 * مكوّن حماية على مستوى الصفحة — يتحقق من أن القسم مفعّل في إعدادات واجهة المستفيد
 * إذا كان القسم مخفياً يُعاد توجيه المستخدم للصفحة الرئيسية
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { BENEFICIARY_SECTION_KEYS } from '@/components/dashboard-layout/constants';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

const RequireBeneficiarySection = ({ children }: Props) => {
  const { role } = useAuth();
  const { pathname } = useLocation();
  const { getJsonSetting, isLoading } = useAppSettings();

  // الناظر والمحاسب لا يخضعون لقيود الأقسام
  if (role === 'admin' || role === 'accountant') return <>{children}</>;

  // أثناء التحميل نعرض فراغ مؤقت لتجنب وميض التوجيه
  if (isLoading) return null;

  const sectionKey = BENEFICIARY_SECTION_KEYS[pathname];
  if (!sectionKey) return <>{children}</>;

  const sections = getJsonSetting<Record<string, boolean>>('beneficiary_sections', {});
  if (sections[sectionKey] === false) {
    const home = role === 'waqif' ? '/waqif' : '/beneficiary';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
};

export default RequireBeneficiarySection;
