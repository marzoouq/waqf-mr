import { fmt } from '@/utils/format';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPercentage } from '@/lib/utils';
import { useDistributeShares } from '@/hooks/financial/useDistribute';
import { Loader2, AlertTriangle, ArrowLeftRight, FileDown, Printer } from 'lucide-react';
import { generateDistributionsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/data/usePdfWaqfInfo';
import { printDistributionReport } from '@/utils/printDistributionReport';
import { toast } from 'sonner';
import { useDistributionCalculation } from '@/hooks/page/useDistributionCalculation';

interface Beneficiary {
  id: string;
  name: string;
  share_percentage: number;
  user_id?: string | null;
}

interface DistributeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaries: Beneficiary[];
  availableAmount: number;
  totalBeneficiaryPercentage: number;
  accountId: string;
  fiscalYearId?: string;
  fiscalYearLabel?: string;
}

const DistributeDialog = ({
  open, onOpenChange, beneficiaries, availableAmount,
  totalBeneficiaryPercentage: _tbp, accountId, fiscalYearId, fiscalYearLabel,
}: DistributeDialogProps) => {
  const pdfWaqfInfo = usePdfWaqfInfo();
  const distribute = useDistributeShares();
  const [pdfLoading, setPdfLoading] = useState(false);

  const { distributions, totalNet, totalAdvances, totalCarryforward, totalDeficit, hasDeficit } =
    useDistributionCalculation(beneficiaries, availableAmount, fiscalYearId, open);

  const handleConfirm = async () => {
    try {
      await distribute.mutateAsync({
        account_id: accountId,
        fiscal_year_id: fiscalYearId,
        distributions,
        total_distributed: totalNet + totalAdvances + totalCarryforward,
      });
      onOpenChange(false);
    } catch {
      // onError in the mutation already shows a toast
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>توزيع حصص المستفيدين</DialogTitle>
          <DialogDescription>
            {fiscalYearLabel && `السنة المالية: ${fiscalYearLabel} — `}
            المبلغ المتاح للتوزيع: {fmt(availableAmount)} ر.س
          </DialogDescription>
        </DialogHeader>

        {beneficiaries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا يوجد مستفيدون</p>
        ) : (
          <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {distributions.map(d => (
              <div key={d.beneficiary_id} className={`rounded-lg border p-3 space-y-2 ${d.deficit > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{d.beneficiary_name}</span>
                  <Badge variant="outline" className="text-xs">{formatPercentage(d.share_percentage)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">الحصة:</span> {fmt(d.share_amount)}</div>
                  <div><span className="text-muted-foreground">السُلف:</span> {d.advances_paid > 0 ? <span className="text-destructive">-{fmt(d.advances_paid)}</span> : '—'}</div>
                  <div><span className="text-muted-foreground">مرحّل:</span> {d.carryforward_deducted > 0 ? <span className="text-warning">-{fmt(d.carryforward_deducted)}</span> : '—'}</div>
                  <div><span className="text-muted-foreground">الصافي:</span> <span className="font-bold text-primary">{d.deficit > 0 ? '0' : fmt(d.net_amount)}</span></div>
                </div>
                {d.deficit > 0 && (
                  <Badge className="bg-destructive/20 text-destructive text-xs">
                    <ArrowLeftRight className="w-3 h-3 ml-1 inline" />يُرحّل {fmt(d.deficit)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">المستفيد</TableHead>
                <TableHead className="text-right">النسبة</TableHead>
                <TableHead className="text-right">الحصة</TableHead>
                <TableHead className="text-right">السُلف</TableHead>
                <TableHead className="text-right">مرحّل</TableHead>
                <TableHead className="text-right">الصافي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distributions.map(d => (
                <TableRow key={d.beneficiary_id} className={d.deficit > 0 ? 'bg-destructive/5' : ''}>
                  <TableCell className="font-medium">{d.beneficiary_name}</TableCell>
                  <TableCell>{formatPercentage(d.share_percentage)}</TableCell>
                  <TableCell>{fmt(d.share_amount)}</TableCell>
                  <TableCell>{d.advances_paid > 0 ? <Badge variant="outline" className="text-destructive">-{fmt(d.advances_paid)}</Badge> : '—'}</TableCell>
                  <TableCell>{d.carryforward_deducted > 0 ? <Badge variant="outline" className="text-warning">-{fmt(d.carryforward_deducted)}</Badge> : '—'}</TableCell>
                  <TableCell>
                    {d.deficit > 0 ? (
                      <div className="space-y-1">
                        <span className="font-bold text-destructive">0</span>
                        <Badge className="bg-destructive/20 text-destructive text-xs block w-fit">
                          <ArrowLeftRight className="w-3 h-3 ml-1 inline" />يُرحّل {fmt(d.deficit)}
                        </Badge>
                      </div>
                    ) : <span className="font-bold text-primary">{fmt(d.net_amount)}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          </>
        )}

        <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex justify-between"><span>إجمالي الصافي المطلوب صرفه</span><span className="font-bold text-primary">{fmt(totalNet)} ر.س</span></div>
          {totalAdvances > 0 && <div className="flex justify-between text-destructive"><span>إجمالي السُلف المخصومة</span><span className="font-bold">-{fmt(totalAdvances)} ر.س</span></div>}
          {totalCarryforward > 0 && <div className="flex justify-between text-warning"><span>إجمالي المرحّل المخصوم (من سنوات سابقة)</span><span className="font-bold">-{fmt(totalCarryforward)} ر.س</span></div>}
          <div className="flex justify-between border-t pt-2"><span>إجمالي التوزيع (شامل الخصومات)</span><span className="font-bold">{fmt(totalNet + totalAdvances + totalCarryforward)} ر.س</span></div>
        </div>

        {hasDeficit && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-destructive">{distributions.filter(d => d.deficit > 0).length} مستفيد لديهم سُلف تتجاوز حصتهم</p>
              <p className="text-muted-foreground mt-1">سيتم ترحيل الفرق ({fmt(totalDeficit)} ر.س) وخصمه تلقائياً من حصصهم في السنة المالية القادمة.</p>
            </div>
          </div>
        )}

        {totalNet + totalAdvances + totalCarryforward > availableAmount && (
          <div className="flex items-center gap-2 text-warning text-sm"><AlertTriangle className="w-4 h-4" />إجمالي التوزيع يتجاوز المبلغ المتاح</div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => printDistributionReport({ fiscalYearLabel: fiscalYearLabel || '', availableAmount, distributions, waqfName: pdfWaqfInfo.waqfName, deedNumber: pdfWaqfInfo.deedNumber, logoUrl: pdfWaqfInfo.logoUrl })} disabled={beneficiaries.length === 0}>
            <Printer className="w-4 h-4 ml-2" />طباعة
          </Button>
          <Button variant="secondary" onClick={async () => { setPdfLoading(true); try { await generateDistributionsPDF({ fiscalYearLabel: fiscalYearLabel || '', availableAmount, distributions }, pdfWaqfInfo); } catch { toast.error('حدث خطأ أثناء تصدير PDF'); } finally { setPdfLoading(false); } }} disabled={beneficiaries.length === 0 || pdfLoading}>
            {pdfLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <FileDown className="w-4 h-4 ml-2" />}تصدير PDF
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={distribute.isPending || beneficiaries.length === 0}>
            {distribute.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}تأكيد التوزيع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DistributeDialog;
