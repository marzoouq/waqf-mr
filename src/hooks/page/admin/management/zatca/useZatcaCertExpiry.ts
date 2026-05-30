/**
 * useZatcaCertExpiry — تحذير انتهاء شهادة ZATCA النشطة
 *
 * ملاحظة: `Date.now()` يُستهلَك داخل `useMemo` لتجنّب اعتباره impure أثناء render
 * (قاعدة react-hooks/purity). يُعاد الحساب فقط عند تغيّر تاريخ انتهاء الشهادة.
 */
import { useMemo } from 'react';
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

  const certExpiryWarning = useMemo<CertExpiryWarning | null>(() => {
    if (!activeCert?.expires_at) return null;
    const expiresAt = new Date(activeCert.expires_at);
    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysLeft < 0) return { daysLeft, level: 'expired', message: 'شهادة ZATCA منتهية الصلاحية. يجب تجديدها فوراً.' };
    if (daysLeft <= 14) return { daysLeft, level: 'critical', message: `شهادة ZATCA ستنتهي خلال ${daysLeft} يوماً. يُرجى تجديدها.` };
    if (daysLeft <= 30) return { daysLeft, level: 'warning', message: `شهادة ZATCA ستنتهي خلال ${daysLeft} يوماً.` };
    return null;
  }, [activeCert?.expires_at]);

  return { activeCert, certExpiryWarning };
}
