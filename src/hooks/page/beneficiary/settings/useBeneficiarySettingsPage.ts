/**
 * هوك صفحة إعدادات المستفيد — منطق وبيانات فقط
 */
import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { useBeneficiariesSafe } from '@/hooks/data/beneficiaries/useBeneficiaries';
import { beneficiariesKeys } from '@/lib/queryKeys/beneficiariesKeys';

export const useBeneficiarySettingsPage = () => {
  const queryClient = useQueryClient();
  const handleRetry = useCallback(
    () => queryClient.invalidateQueries({ queryKey: beneficiariesKeys.prefixes.safe }),
    [queryClient],
  );
  const { user } = useAuth();
  const {
    data: beneficiaries = [],
    isLoading: benLoading,
    isError: benError,
  } = useBeneficiariesSafe();

  const currentBeneficiary = beneficiaries.find((b) => b.user_id === user?.id);
  // B9: رقم الهوية مُخفي كلياً عمداً (PII حسّاس مشفّر AES-256) — لا نعرض آخر 4 خانات حماية للخصوصية
  const maskedId = currentBeneficiary?.national_id ? '********' : '—';
  const maskedIdAriaLabel = currentBeneficiary?.national_id
    ? 'رقم الهوية مُخفي لحماية خصوصيتك'
    : 'رقم الهوية غير مسجَّل';

  return {
    user,
    currentBeneficiary,
    maskedId,
    maskedIdAriaLabel,
    benLoading,
    benError,
    handleRetry,
  };
};
