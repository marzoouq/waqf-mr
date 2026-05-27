/**
 * قائمة سندات الصرف المرتبطة بمصروف.
 * - للناظر/المحاسب: السندات الكاملة مع PII وأزرار اعتماد/إلغاء/تنزيل.
 * - للمستفيد/الواقف: النسخة العامة (بدون PII) مع زر تنزيل PDF للسندات المعتمدة فقط.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import {
  useDisbursementVouchersByExpense,
  useDisbursementVouchersPublicByExpense,
  getVoucherSignedUrl,
  type Voucher,
  type VoucherPublic,
} from '@/hooks/data/financial/useDisbursementVouchers';
import {
  useApproveVoucherAction,
  useVoidVoucherAction,
  useGenerateVoucherPdfAction,
} from '@/hooks/page/admin/financial/useVoucherActions';
import { VOUCHER_PAYMENT_METHODS, VOUCHER_STATUS_LABELS } from '@/constants/entities';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { fmt } from '@/utils/format/format';
import VoucherFormDialog from './VoucherFormDialog';
import VoidVoucherDialog from './VoidVoucherDialog';
import { toast } from 'sonner';


interface VoucherListProps {
  expenseId: string;
  expenseAmount: number;
  expenseDescription?: string;
  isLocked?: boolean;
}

const statusVariant = (s: string | null | undefined) => {
  if (s === 'approved') return 'default' as const;
  if (s === 'void') return 'destructive' as const;
  return 'secondary' as const;
};

const VoucherList: React.FC<VoucherListProps> = ({ expenseId, expenseAmount, expenseDescription, isLocked }) => {
  const { role } = useAuth();
  const isManager = role === 'admin' || role === 'accountant';

  const fullQ = useDisbursementVouchersByExpense(isManager ? expenseId : undefined);
  const pubQ = useDisbursementVouchersPublicByExpense(!isManager ? expenseId : undefined);
  const approveMut = useApproveVoucherAction();
  const voidMut = useVoidVoucherAction();
  const genPdfMut = useGenerateVoucherPdfAction();
  const [formOpen, setFormOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Voucher | null>(null);

  const download = async (pdfPath: string | null) => {
    if (!pdfPath) { toast.error('لم يُصدر PDF بعد — اعتمد السند أولاً'); return; }
    const url = await getVoucherSignedUrl(pdfPath);
    if (!url) { toast.error('تعذّر إنشاء رابط التنزيل'); return; }
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  const [voidReason, setVoidReason] = useState('');

  const vouchers: Array<Voucher | VoucherPublic> = isManager ? (fullQ.data || []) : (pubQ.data || []);
  const isLoading = isManager ? fullQ.isLoading : pubQ.isLoading;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          <Receipt className="w-3 h-3" />
          سندات الصرف ({vouchers.length})
        </p>
        {isManager && !isLocked && (
          <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
            + سند صرف
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">جارٍ التحميل…</p>
      ) : vouchers.length === 0 ? (
        <p className="text-xs text-muted-foreground">لا توجد سندات صرف لهذا المصروف</p>
      ) : (
        <div className="space-y-2">
          {vouchers.map((v) => {
            const full = isManager ? (v as Voucher) : null;
            const status = v.status ?? 'draft';
            const method = (v.payment_method ?? 'cash') as keyof typeof VOUCHER_PAYMENT_METHODS;
            return (
              <div key={v.id ?? ''} className="border rounded-md p-3 bg-background space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm">{v.voucher_number}</span>
                    <Badge variant={statusVariant(status)} className="text-[10px]">
                      {VOUCHER_STATUS_LABELS[status as keyof typeof VOUCHER_STATUS_LABELS]}
                    </Badge>
                  </div>
                  <div className="text-sm font-semibold">
                    {fmt(Number(v.amount || 0))} ر.س
                  </div>
                </div>

                {isManager && full && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <div>المستلم: <span className="text-foreground">{full.recipient_name}</span></div>
                    <div>الهوية: {full.recipient_id_number} · الجوال: {full.recipient_phone}</div>
                  </div>
                )}
                <div className="text-xs text-muted-foreground">
                  طريقة الدفع: {VOUCHER_PAYMENT_METHODS[method]}
                </div>
                {v.work_description && (
                  <p className="text-xs text-foreground/80 leading-relaxed">{v.work_description}</p>
                )}
                {full?.void_reason && (
                  <p className="text-xs text-destructive">سبب الإلغاء: {full.void_reason}</p>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {status === 'approved' && v.pdf_path && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                      onClick={() => download(v.pdf_path)}>
                      <Download className="w-3 h-3" /> تنزيل PDF
                    </Button>
                  )}
                  {isManager && status === 'approved' && !v.pdf_path && v.id && (
                    <Button size="sm" variant="secondary" className="h-7 text-xs gap-1"
                      onClick={() => genPdfMut.mutate(v.id!)} disabled={genPdfMut.isPending}>
                      <FileText className="w-3 h-3" />
                      {genPdfMut.isPending ? 'جارٍ الإصدار…' : 'إصدار PDF'}
                    </Button>
                  )}
                  {isManager && full && status === 'draft' && !isLocked && (
                    <Button size="sm" variant="default" className="h-7 text-xs gap-1"
                      onClick={() => approveMut.mutate(full.id)} disabled={approveMut.isPending}>
                      <CheckCircle2 className="w-3 h-3" /> اعتماد + إصدار PDF
                    </Button>
                  )}
                  {isManager && full && status !== 'void' && !isLocked && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                      onClick={() => setVoidTarget(full)}>
                      <XCircle className="w-3 h-3" /> إلغاء
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isManager && (
        <VoucherFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          expenseId={expenseId}
          expenseAmount={expenseAmount}
          defaultDescription={expenseDescription}
        />
      )}

      <AlertDialog open={!!voidTarget} onOpenChange={(o) => { if (!o) { setVoidTarget(null); setVoidReason(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء سند الصرف</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إلغاء سند {voidTarget?.voucher_number} ولا يمكن التراجع. أدخل سبب الإلغاء:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">سبب الإلغاء *</Label>
            <Textarea id="void-reason" rows={3} value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)} />
          </div>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={voidMut.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (!voidTarget) return;
                if (!voidReason.trim()) { toast.error('سبب الإلغاء مطلوب'); return; }
                voidMut.mutate(
                  { voucherId: voidTarget.id, reason: voidReason.trim() },
                  { onSettled: () => { setVoidTarget(null); setVoidReason(''); } },
                );
              }}
            >
              {voidMut.isPending ? 'جارٍ الإلغاء…' : 'تأكيد الإلغاء'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default VoucherList;
