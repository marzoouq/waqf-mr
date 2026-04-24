/**
 * useZatcaOnboarding — تسجيل شهادة الامتثال + الترقية لشهادة الإنتاج
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { defaultNotify } from '@/lib/notify';
import { zatcaOnboard } from '@/lib/services/zatcaService';

export function useZatcaOnboarding() {
  const queryClient = useQueryClient();
  const [onboardLoading, setOnboardLoading] = useState(false);
  const [productionLoading, setProductionLoading] = useState(false);

  const handleOnboard = useCallback(async () => {
    setOnboardLoading(true);
    try {
      await zatcaOnboard();
      defaultNotify.success('تم إرسال طلب التسجيل');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
    } catch (e) {
      defaultNotify.error(e instanceof Error ? e.message : 'فشل التسجيل');
    } finally {
      setOnboardLoading(false);
    }
  }, [queryClient]);

  const handleProductionUpgrade = useCallback(async () => {
    setProductionLoading(true);
    try {
      const { error } = await supabase.functions.invoke('zatca-onboard', { body: { action: 'production' } });
      if (error) throw error;
      defaultNotify.success('✅ تمت الترقية لشهادة الإنتاج بنجاح');
      queryClient.invalidateQueries({ queryKey: ['zatca-certificates'] });
    } catch (e) {
      defaultNotify.error(e instanceof Error ? e.message : 'فشلت الترقية للإنتاج');
    } finally {
      setProductionLoading(false);
    }
  }, [queryClient]);

  return { onboardLoading, productionLoading, handleOnboard, handleProductionUpgrade };
}
