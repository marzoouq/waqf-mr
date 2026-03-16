import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatPercentage } from '@/lib/utils';
import { useDistributeShares } from '@/hooks/useDistribute';
import { Loader2, AlertTriangle, ArrowLeftRight, FileDown, Printer } from 'lucide-react';
import { generateDistributionsPDF } from '@/utils/pdf';
import { usePdfWaqfInfo } from '@/hooks/usePdfWaqfInfo';
import { printDistributionReport } from '@/utils/printDistributionReport';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { safeNumber } from '@/utils/safeNumber';

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

  // جلب السُلف المصروفة لكل مستفيد في هذه السنة
  const { data: paidAdvances = [] } = useQuery({
    queryKey: ['advance_requests', 'paid_all', fiscalYearId],
    queryFn: async () => {
      // G2 fix: إزالة as any واستخدام النوع الصحيح
      let query = supabase
        .from('advance_requests')
        .select('beneficiary_id, amount')
        .eq('status', 'paid');
      if (fiscalYearId) query = query.eq('fiscal_year_id', fiscalYearId);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { beneficiary_id: string; amount: number }[];
    },
    enabled: open,
  });

  // جلب الفروق المرحّلة النشطة المرتبطة بسنوات سابقة (تُخصم عند التوزيع)
  // نفلتر بـ to_fiscal_year_id = fiscalYearId (أو null = لم تُحدد سنة وجهة بعد)
  const { data: activeCarryforwards = [] } = useQuery({
    queryKey: ['advance_carryforward', 'active_for_distribution', fiscalYearId],
    queryFn: async () => {
      // G2 fix: إزالة as any واستخدام النوع الصحيح
      let query = supabase
        .from('advance_carryforward')
        .select('beneficiary_id, amount')
        .eq('status', 'active');
      // جلب الترحيلات التي وجهتها السنة الحالية أو لم تُحدد لها وجهة بعد
      if (fiscalYearId) {
        query = query.or(`to_fiscal_year_id.eq.${fiscalYearId},to_fiscal_year_id.is.null`);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as { beneficiary_id: string; amount: number }[];
    },
    enabled: open,
  });

  const advancesByBeneficiary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const adv of paidAdvances) {
      map[adv.beneficiary_id] = (map[adv.beneficiary_id] || 0) + safeNumber(adv.amount);
    }
    return map;
  }, [paidAdvances]);

  const carryforwardByBeneficiary = useMemo(() => {
    const map: Record<string, number> = {};
    for (const cf of activeCarryforwards) {
      map[cf.beneficiary_id] = (map[cf.beneficiary_id] || 0) + safeNumber(cf.amount);
    }
    return map;
  }, [activeCarryforwards]);

  const distributions = useMemo(() => {
    // === Largest Remainder algorithm for precise share allocation ===
    // F-AUDIT: استخدام مجموع النسب الفعلي (totalPercentage) بدلاً من 100 الثابتة
    // لضمان التناسق مع get_max_advance_amount و validate_advance_request_amount في DB
    const totalPercentage = beneficiaries.reduce((s, b) => s + safeNumber(b.share_percentage), 0);
    if (totalPercentage === 0 || availableAmount === 0) {
      return beneficiaries.map(b => ({
        beneficiary_id: b.id, beneficiary_name: b.name, beneficiary_user_id: b.user_id,
        share_percentage: b.share_percentage, share_amount: 0, advances_paid: 0,
        carryforward_deducted: 0, net_amount: 0, deficit: 0,
      }));
    }

    // Step 1: Calculate raw shares and floor them to 2 decimals
    // F-AUDIT fix: normalize by totalPercentage (not hardcoded 100) to match DB RPC behavior
    const rawShares = beneficiaries.map(b => {
      const exact = availableAmount * safeNumber(b.share_percentage) / totalPercentage;
      const floored = Math.floor(exact * 100) / 100;
      return { id: b.id, exact, floored, remainder: exact - floored };
    });

    // Step 2: Distribute the remaining pennies by largest remainder
    const totalFloored = rawShares.reduce((s, r) => s + r.floored, 0);
    let remainingPennies = Math.round((availableAmount - totalFloored) * 100);
    const sorted = [...rawShares].sort((a, b) => b.remainder - a.remainder);
    const adjustments: Record<string, number> = {};
    for (const item of sorted) {
      if (remainingPennies <= 0) break;
      adjustments[item.id] = 0.01;
      remainingPennies--;
    }

    // Step 3: Build distributions with deductions
    return beneficiaries.map(b => {
      const raw = rawShares.find(r => r.id === b.id)!;
      const shareAmount = raw.floored + (adjustments[b.id] || 0);
      const advances = advancesByBeneficiary[b.id] || 0;
      const carryforward = carryforwardByBeneficiary[b.id] || 0;
      const totalDeductions = advances + carryforward;
      const rawNet = shareAmount - totalDeductions;
      const net = Math.max(0, Math.round(rawNet * 100) / 100);
      // L-02 fix: deficit is simply the negative portion of rawNet — no double counting
      const deficit = rawNet < 0 ? Math.round(Math.abs(rawNet) * 100) / 100 : 0;

      // G3 fix: حساب carryforward_deducted بشكل صحيح — يُخصم بعد السُلف
      const afterAdvances = Math.max(0, shareAmount - advances);
      const actualCarryforward = Math.min(carryforward, afterAdvances);

      return {
        beneficiary_id: b.id,
        beneficiary_name: b.name,
        beneficiary_user_id: b.user_id,
        share_percentage: b.share_percentage,
        share_amount: shareAmount,
        advances_paid: advances,
        carryforward_deducted: Math.round(actualCarryforward * 100) / 100,
        net_amount: net,
        deficit,
      };
    });
  }, [beneficiaries, availableAmount, advancesByBeneficiary, carryforwardByBeneficiary]);

  const totalNet = distributions.reduce((s, d) => s + d.net_amount, 0);
  const totalAdvances = distributions.reduce((s, d) => s + d.advances_paid, 0);
  const totalCarryforward = distributions.reduce((s, d) => s + d.carryforward_deducted, 0);
  const totalDeficit = distributions.reduce((s, d) => s + d.deficit, 0);
  const hasDeficit = totalDeficit > 0;

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
      // onError in the mutation already shows a toast — just prevent unhandled rejection
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>توزيع حصص المستفيدين</DialogTitle>
          <DialogDescription>
            {fiscalYearLabel && `السنة المالية: ${fiscalYearLabel} — `}
            المبلغ المتاح للتوزيع: {availableAmount.toLocaleString()} ر.س
          </DialogDescription>
        </DialogHeader>

        {beneficiaries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا يوجد مستفيدون</p>
        ) : (
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
                  <TableCell>{d.share_amount.toLocaleString()}</TableCell>
                  <TableCell>
                    {d.advances_paid > 0 ? (
                      <Badge variant="outline" className="text-destructive">-{d.advances_paid.toLocaleString()}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {d.carryforward_deducted > 0 ? (
                      <Badge variant="outline" className="text-warning">-{d.carryforward_deducted.toLocaleString()}</Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    {d.deficit > 0 ? (
                      <div className="space-y-1">
                        <span className="font-bold text-destructive">0</span>
                        <Badge className="bg-destructive/20 text-destructive text-[10px] block w-fit">
                          <ArrowLeftRight className="w-3 h-3 ml-1 inline" />
                          يُرحّل {d.deficit.toLocaleString()}
                        </Badge>
                      </div>
                    ) : (
                      <span className="font-bold text-primary">{d.net_amount.toLocaleString()}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <div className="space-y-2 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex justify-between">
            <span>إجمالي الصافي المطلوب صرفه</span>
            <span className="font-bold text-primary">{totalNet.toLocaleString()} ر.س</span>
          </div>
          {totalAdvances > 0 && (
            <div className="flex justify-between text-destructive">
              <span>إجمالي السُلف المخصومة</span>
              <span className="font-bold">-{totalAdvances.toLocaleString()} ر.س</span>
            </div>
          )}
          {totalCarryforward > 0 && (
            <div className="flex justify-between text-warning">
              <span>إجمالي المرحّل المخصوم (من سنوات سابقة)</span>
              <span className="font-bold">-{totalCarryforward.toLocaleString()} ر.س</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span>إجمالي التوزيع (شامل الخصومات)</span>
            <span className="font-bold">{(totalNet + totalAdvances + totalCarryforward).toLocaleString()} ر.س</span>
          </div>
        </div>

        {hasDeficit && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-destructive">
                {distributions.filter(d => d.deficit > 0).length} مستفيد لديهم سُلف تتجاوز حصتهم
              </p>
              <p className="text-muted-foreground mt-1">
                سيتم ترحيل الفرق ({totalDeficit.toLocaleString()} ر.س) وخصمه تلقائياً من حصصهم في السنة المالية القادمة.
              </p>
            </div>
          </div>
        )}

        {totalNet + totalAdvances + totalCarryforward > availableAmount && (
          <div className="flex items-center gap-2 text-warning text-sm">
            <AlertTriangle className="w-4 h-4" />
            إجمالي التوزيع يتجاوز المبلغ المتاح
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              printDistributionReport({
                fiscalYearLabel: fiscalYearLabel || '',
                availableAmount,
                distributions,
                waqfName: pdfWaqfInfo.waqfName,
                deedNumber: pdfWaqfInfo.deedNumber,
                logoUrl: pdfWaqfInfo.logoUrl,
              });
            }}
            disabled={beneficiaries.length === 0}
          >
            <Printer className="w-4 h-4 ml-2" />
            طباعة
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              setPdfLoading(true);
              try {
                await generateDistributionsPDF({
                  fiscalYearLabel: fiscalYearLabel || '',
                  availableAmount,
                  distributions,
                }, pdfWaqfInfo);
              } catch {
                toast.error('حدث خطأ أثناء تصدير PDF');
              } finally {
                setPdfLoading(false);
              }
            }}
            disabled={beneficiaries.length === 0 || pdfLoading}
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <FileDown className="w-4 h-4 ml-2" />}
            تصدير PDF
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button
            onClick={handleConfirm}
            disabled={distribute.isPending || beneficiaries.length === 0}
          >
            {distribute.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            تأكيد التوزيع
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DistributeDialog;
