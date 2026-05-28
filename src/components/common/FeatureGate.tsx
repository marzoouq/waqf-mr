/**
 * FeatureGate — يلفّ أقسام الواجهة ويظهرها فقط إذا كانت الميزة مرئية للناظر.
 *
 * طبقة عرض بحتة — لا تستبدل أي RLS. عناصر `lockable=true` تظهر دائماً
 * (يتكفّل بذلك useFeatureVisibility).
 */
import type { ReactNode } from 'react';
import { useFeatureVisibility } from '@/hooks/data/settings/permissions/useFeatureVisibility';
import type { FeatureScope } from '@/constants/featureVisibilityRegistry';

interface FeatureGateProps {
  scope: FeatureScope;
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

const FeatureGate = ({ scope, featureKey, children, fallback = null }: FeatureGateProps) => {
  const { isVisible } = useFeatureVisibility();
  if (!isVisible(scope, featureKey)) return <>{fallback}</>;
  return <>{children}</>;
};

export default FeatureGate;
