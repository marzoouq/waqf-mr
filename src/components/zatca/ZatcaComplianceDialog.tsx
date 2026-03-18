/**
 * حوار نتيجة فحص الامتثال — Compliance Result Dialog
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ClipboardCheck } from 'lucide-react';

interface ComplianceMessage {
  code: string;
  message: string;
}

interface ComplianceResult {
  warningMessages?: ComplianceMessage[];
  errorMessages?: ComplianceMessage[];
  infoMessages?: ComplianceMessage[];
  validationResults?: {
    status?: string;
    warningMessages?: ComplianceMessage[];
    errorMessages?: ComplianceMessage[];
    infoMessages?: ComplianceMessage[];
  };
}

interface ZatcaComplianceDialogProps {
  result: ComplianceResult | null;
  onClose: () => void;
}

export default function ZatcaComplianceDialog({ result, onClose }: ZatcaComplianceDialogProps) {
  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            نتيجة فحص الامتثال
          </DialogTitle>
          <DialogDescription>تفاصيل الرد من بوابة ZATCA</DialogDescription>
        </DialogHeader>
        {result && (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">النتيجة:</span>
                <Badge variant={
                  result.validationResults?.status === 'PASS' ? 'default' :
                  result.validationResults?.status === 'WARNING' ? 'secondary' : 'destructive'
                }>
                  {result.validationResults?.status === 'PASS' ? '✅ ناجح' :
                   result.validationResults?.status === 'WARNING' ? '⚠️ تحذيرات' : '❌ فشل'}
                </Badge>
              </div>

              {((result.warningMessages?.length ?? 0) > 0 || (result.validationResults?.warningMessages?.length ?? 0) > 0) && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-accent-foreground">تحذيرات:</p>
                  {(result.warningMessages || result.validationResults?.warningMessages || []).map((w, i) => (
                    <div key={i} className="text-xs bg-secondary/50 rounded p-2 border border-border">
                      <span className="font-mono">{w.code}</span>: {w.message}
                    </div>
                  ))}
                </div>
              )}

              {((result.errorMessages?.length ?? 0) > 0 || (result.validationResults?.errorMessages?.length ?? 0) > 0) && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-destructive">أخطاء:</p>
                  {(result.errorMessages || result.validationResults?.errorMessages || []).map((e, i) => (
                    <div key={i} className="text-xs bg-destructive/10 rounded p-2 border border-destructive/20">
                      <span className="font-mono">{e.code}</span>: {e.message}
                    </div>
                  ))}
                </div>
              )}

              {((result.infoMessages?.length ?? 0) > 0 || (result.validationResults?.infoMessages?.length ?? 0) > 0) && (
                <div className="space-y-1">
                  <p className="text-sm font-medium">معلومات:</p>
                  {(result.infoMessages || result.validationResults?.infoMessages || []).map((m, i) => (
                    <div key={i} className="text-xs bg-muted rounded p-2">
                      <span className="font-mono">{m.code}</span>: {m.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
