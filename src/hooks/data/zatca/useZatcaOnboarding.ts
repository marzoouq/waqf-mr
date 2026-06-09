/**
 * useZatcaOnboarding — تسجيل شهادة الامتثال + الترقية لشهادة الإنتاج
 * بلا أي toast — الإشعارات تُدار في طبقة الصفحة (hooks/page)
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { invoke } from '@/lib/api/invoke';
import { zatcaOnboard } from '@/lib/services/zatcaService';
import { zatcaKeys } from '@/lib/queryKeys/zatcaKeys';

export function useZatcaOnboarding() {
  const queryClient = useQueryClient();
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [productionLoading, setProductionLoading] = useState(false);

  const handleOnboard = useCallback(async () => {
    setOnboardLoading(true);
    try {
      await zatcaOnboard();
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.certificates });
    } finally {
      setOnboardLoading(false);
    }
  }, [queryClient]);

  const handleProductionUpgrade = useCallback(async () => {
    setProductionLoading(true);
    try {
      // maxAttempts:1 — تسجيل/ترقية شهادة لا يجوز تكرارها تلقائياً
      await invoke('zatca-onboard', { body: { action: 'production' } }, { maxAttempts: 1 });
      queryClient.invalidateQueries({ queryKey: zatcaKeys.prefixes.certificates });
    } finally {
      setProductionLoading(false);
    }
  }, [queryClient]);

  return { onboardLoading, productionLoading, handleOnboard, handleProductionUpgrade };
}
