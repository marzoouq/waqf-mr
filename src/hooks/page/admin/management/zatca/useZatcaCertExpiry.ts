/**
 * useZatcaCertExpiry — تحذير انتهاء شهادة ZATCA النشطة
 */
import { useZatcaCertificates } from '@/hooks/data/zatca/useZatcaCertificates';

export type CertExpiryLevel = 'expired' | 'critical' | 'warning';
export interface CertExpiryWarning {
  daysLeft: number;
  level: CertExpiryLevel;
  message: string;
}

export function useZatcaCertExpiry() {
  const { data: certificates = [] } = useZatcaCertificates();
  const activeCert = certificates.find(c => c.is_active);

  let certExpiryWarning: CertExpiryWarning | null = null;
  if (activeCert?.expires_at) {
    const expiresAt = new Date(activeCert.expires_at);
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) certExpiryWarning = { daysLeft, level: 'expired', message: 'شهادة ZATCA منتهية الصلاحية. يجب تجديدها فوراً.' };
    else if (daysLeft <= 14) certExpiryWarning = { daysLeft, level: 'critical', message: `شهادة ZATCA ستنتهي خلال ${daysLeft} يوماً. يُرجى تجديدها.` };
    else if (daysLeft <= 30) certExpiryWarning = { daysLeft, level: 'warning', message: `شهادة ZATCA ستنتهي خلال ${daysLeft} يوماً.` };
  }

  return { activeCert, certExpiryWarning };
}
