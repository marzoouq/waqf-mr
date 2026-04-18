/**
 * هوك صفحة إعدادات المستفيد — منطق وبيانات فقط
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useBeneficiariesSafe } from '@/hooks/data/beneficiaries/useBeneficiaries';

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

  return {
    user,
    currentBeneficiary,
    maskedId,
    benLoading,
    benError,
    handleRetry,
  };
};
