/**
 * هوك جلب إعداد التسجيل — مستخرج من useAuthPage
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { appSettingsKeys } from '@/lib/queryKeys/appSettingsKeys';

export function useRegistrationEnabled() {
  return useQuery({
    queryKey: appSettingsKeys.registrationEnabled(),
    queryFn: async ({ signal }) => {
      const { data } = await supabase.from('app_settings')
        .select('value')
        .eq('key', 'registration_enabled')
        .maybeSingle();
      return data?.value === 'true';
    },
    staleTime: STALE_STATIC,
    gcTime: 30 * 60_000,
  });
}
