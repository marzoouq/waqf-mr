/**
 * هوك صفحة إعدادات المستفيد
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useBeneficiariesSafe } from '@/hooks/data/beneficiaries/useBeneficiaries';
import type { TabItem } from '@/components/ui/responsive-tabs';
import { User, Lock, Bell, Shield, Palette } from 'lucide-react';
import { createElement } from 'react';

export const useBeneficiarySettingsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['beneficiaries-safe'] }),
    [queryClient],
  );
  const { user } = useAuth();
  const {
    data: beneficiaries = [],
    isLoading: benLoading,
    isError: benError,
  } = useBeneficiariesSafe();

  const currentBeneficiary = beneficiaries.find((b) => b.user_id === user?.id);
  const maskedId = currentBeneficiary?.national_id ? '********' : '—';

  const tabItems: TabItem[] = [
    { value: 'account', label: 'الحساب', icon: createElement(User, { className: 'w-4 h-4' }) },
    { value: 'password', label: 'كلمة المرور', icon: createElement(Lock, { className: 'w-4 h-4' }) },
    { value: 'biometric', label: 'البصمة', icon: createElement(Shield, { className: 'w-4 h-4' }) },
    { value: 'notifications', label: 'الإشعارات', icon: createElement(Bell, { className: 'w-4 h-4' }) },
    { value: 'theme', label: 'المظهر', icon: createElement(Palette, { className: 'w-4 h-4' }) },
  ];

  return {
    user,
    currentBeneficiary,
    maskedId,
    benLoading,
    benError,
    handleRetry,
    tabItems,
  };
};
