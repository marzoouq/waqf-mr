import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';

interface CertExpiryWarning {
  level: 'expired' | 'critical' | 'warning';
  message: string;
}

interface ZatcaCertExpiryWarningProps {
  warning: CertExpiryWarning;
  isProductionCert: boolean;
  onRenew: () => void;
  renewLoading: boolean;
}

const ZatcaCertExpiryWarning = ({ warning, isProductionCert, onRenew, renewLoading }: ZatcaCertExpiryWarningProps) => {
  return (
    <Card className={cn(
      'shadow-sm border',
      warning.level === 'expired' ? 'border-destructive/50 bg-destructive/5' :
      warning.level === 'critical' ? 'border-warning/50 bg-warning/5' :
      'border-warning/30 bg-warning/5'
    )}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className={cn(
            'w-5 h-5 shrink-0',
            warning.level === 'expired' ? 'text-destructive' : 'text-warning'
          )} />
          <div className="flex-1">
            <p className={cn(
              'text-sm font-bold',
              warning.level === 'expired' ? 'text-destructive' : 'text-warning'
            )}>
              {warning.message}
            </p>
          </div>
          {isProductionCert && (
            <Button size="sm" variant="outline" onClick={onRenew} disabled={renewLoading} className="shrink-0">
              {renewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span className="mr-1">تجديد</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ZatcaCertExpiryWarning;
