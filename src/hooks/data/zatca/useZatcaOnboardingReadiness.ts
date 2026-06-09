/**
 * useZatcaOnboardingReadiness — قراءة الإعدادات الحرجة الثلاث المطلوبة
 * لبدء onboarding مع ZATCA، وحساب قائمة الناقص + علامة الجاهزية.
 */
import { useQuery } from '@tanstack/react-query';
import { STALE_STATIC } from '@/lib/queryStaleTime';
import { zatcaInvoicesService } from '@/lib/services/zatcaInvoicesService';
import { zatcaKeys } from '@/lib/queryKeys/zatcaKeys';

export function useZatcaOnboardingReadiness() {
  const { data: zatcaSettings } = useQuery({
    queryKey: zatcaKeys.requiredSettings(),
    staleTime: STALE_STATIC,
    queryFn: () => zatcaInvoicesService.getRequiredSettings(),
  });

  const missingSettings = [
    ...(!zatcaSettings?.zatca_device_serial ? ['الرقم التسلسلي للجهاز'] : []),
    ...(!zatcaSettings?.vat_registration_number ? ['الرقم الضريبي'] : []),
    ...(!zatcaSettings?.waqf_name ? ['اسم المنشأة'] : []),
  ];
  const canOnboard = missingSettings.length === 0;

  return { zatcaSettings, missingSettings, canOnboard };
}
