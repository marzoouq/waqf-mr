import { useWaqfInfo } from '@/hooks/useAppSettings';
import type { PdfWaqfInfo } from '@/utils/pdf';

export const usePdfWaqfInfo = (): PdfWaqfInfo => {
  const { data: waqfInfo } = useWaqfInfo();

  return {
    waqfName: waqfInfo?.waqf_name || '',
    deedNumber: waqfInfo?.waqf_deed_number ? `صك رقم: ${waqfInfo.waqf_deed_number}` : undefined,
    court: waqfInfo?.waqf_court ? `المحكمة: ${waqfInfo.waqf_court}` : undefined,
    logoUrl: waqfInfo?.waqf_logo_url || undefined,
  };
};
