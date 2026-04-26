/**
 * useZatcaSettings — قراءة إعدادات ZATCA المطلوبة + حساب الجاهزية للـ onboarding
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { STALE_STATIC } from '@/lib/queryStaleTime';

export function useZatcaSettings() {
  const { data: zatcaSettings } = useQuery({
    queryKey: ['zatca-required-settings'],
    staleTime: STALE_STATIC,
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('key, value')
        .in('key', ['waqf_name', 'vat_registration_number', 'zatca_device_serial']);
      const map: Record<string, string> = {};
      (data || []).forEach(s => { map[s.key] = s.value; });
      return map;
    },
  });

  const missingSettings = [
    ...(!zatcaSettings?.zatca_device_serial ? ['الرقم التسلسلي للجهاز'] : []),
    ...(!zatcaSettings?.vat_registration_number ? ['الرقم الضريبي'] : []),
    ...(!zatcaSettings?.waqf_name ? ['اسم المنشأة'] : []),
  ];
  const canOnboard = missingSettings.length === 0;

  return { zatcaSettings, missingSettings, canOnboard };
}
