/**
 * عرض خطوات دورة عمل شهادات ZATCA (تسجيل ← امتثال ← إنتاج)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, CheckCircle, ArrowUpCircle, ClipboardCheck } from 'lucide-react';

interface Props {
  hasActiveCert: boolean;
  isComplianceCert: boolean;
  isProductionCert: boolean;
}

export default function CertificateWorkflowSteps({ hasActiveCert, isComplianceCert, isProductionCert }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">دورة العمل</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${hasActiveCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
            <ShieldCheck className="w-4 h-4" />
            <span className="text-sm font-medium">١. التسجيل</span>
            {hasActiveCert && <CheckCircle className="w-3 h-3" />}
          </div>
          <span className="text-muted-foreground">←</span>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${isComplianceCert ? 'bg-secondary border-primary text-secondary-foreground' : isProductionCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
            <ClipboardCheck className="w-4 h-4" />
            <span className="text-sm font-medium">٢. فحص الامتثال</span>
            {isProductionCert && <CheckCircle className="w-3 h-3" />}
          </div>
          <span className="text-muted-foreground">←</span>
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border ${isProductionCert ? 'bg-primary/10 border-primary text-primary' : 'bg-muted border-border text-muted-foreground'}`}>
            <ArrowUpCircle className="w-4 h-4" />
            <span className="text-sm font-medium">٣. الإنتاج</span>
            {isProductionCert && <CheckCircle className="w-3 h-3" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
