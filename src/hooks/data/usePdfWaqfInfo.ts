import { useWaqfInfo } from '@/hooks/useAppSettings';
import { useAppSettings } from '@/hooks/useAppSettings';
import type { PdfWaqfInfo } from '@/utils/pdf';

export const usePdfWaqfInfo = (): PdfWaqfInfo => {
  const { data: waqfInfo } = useWaqfInfo();
  const { data: settings } = useAppSettings();

  // بناء العنوان من الحقول المتاحة
  const addressParts = [
    settings?.business_address_street,
    settings?.business_address_district,
    settings?.business_address_city,
    settings?.business_address_postal_code,
  ].filter(Boolean);

  return {
    waqfName: waqfInfo?.waqf_name || '',
    deedNumber: waqfInfo?.waqf_deed_number ? `صك رقم: ${waqfInfo.waqf_deed_number}` : undefined,
    court: waqfInfo?.waqf_court ? `المحكمة: ${waqfInfo.waqf_court}` : undefined,
    logoUrl: waqfInfo?.waqf_logo_url || undefined,
    vatNumber: waqfInfo?.vat_registration_number || undefined,
    commercialReg: settings?.commercial_registration_number || undefined,
    address: addressParts.length > 0 ? addressParts.join('، ') : undefined,
    bankName: settings?.waqf_bank_name || undefined,
    bankAccount: settings?.waqf_bank_account || undefined,
    bankIBAN: settings?.waqf_bank_iban || undefined,
  };
};
