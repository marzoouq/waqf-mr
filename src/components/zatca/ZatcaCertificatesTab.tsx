/**
 * تبويب شهادات ZATCA — منسّق رفيع يجمع: دورة العمل + الجدول + إجراءات التسجيل/الترقية
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import CertificateWorkflowSteps from './certificates/CertificateWorkflowSteps';
import CertificatesTable, { type Certificate } from './certificates/CertificatesTable';
import CertificateActions from './certificates/CertificateActions';

interface ZatcaCertificatesTabProps {
  certificates: Certificate[];
  certsLoading: boolean;
  isComplianceCert: boolean;
  isProductionCert: boolean;
  activeCert: Certificate | undefined;
  canOnboard: boolean;
  missingSettings: string[];
  onboardLoading: boolean;
  productionLoading: boolean;
  onOnboard: () => void;
  onProductionUpgrade: () => void;
}

export default function ZatcaCertificatesTab({
  certificates, certsLoading, isComplianceCert, isProductionCert, activeCert,
  canOnboard, missingSettings, onboardLoading, productionLoading,
  onOnboard, onProductionUpgrade,
}: ZatcaCertificatesTabProps) {
  return (
    <div className="space-y-4">
      <CertificateWorkflowSteps
        hasActiveCert={Boolean(activeCert)}
        isComplianceCert={isComplianceCert}
        isProductionCert={isProductionCert}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            شهادات ZATCA
          </CardTitle>
        </CardHeader>
        <CardContent>
          {certsLoading ? (
            <p className="text-muted-foreground text-center py-8">جارٍ التحميل...</p>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <AlertTriangle className="w-12 h-12 mx-auto text-accent-foreground" />
              <p className="text-muted-foreground">لا توجد شهادات مسجّلة</p>
              <p className="text-sm text-muted-foreground">يجب التسجيل في بوابة فاتورة أولاً للحصول على CSID</p>
              <CertificateActions
                variant="initial"
                canOnboard={canOnboard}
                missingSettings={missingSettings}
                onboardLoading={onboardLoading}
                productionLoading={productionLoading}
                isComplianceCert={isComplianceCert}
                onOnboard={onOnboard}
                onProductionUpgrade={onProductionUpgrade}
              />
            </div>
          ) : (
            <div className="space-y-4">
              <CertificatesTable certificates={certificates} />
              <CertificateActions
                variant="manage"
                canOnboard={canOnboard}
                missingSettings={missingSettings}
                onboardLoading={onboardLoading}
                productionLoading={productionLoading}
                isComplianceCert={isComplianceCert}
                onOnboard={onOnboard}
                onProductionUpgrade={onProductionUpgrade}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
