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
  useApproveVoucher,
  useVoidVoucher,
  getVoucherSignedUrl,
  type Voucher,
  type VoucherPublic,
} from '@/hooks/data/financial/useDisbursementVouchers';
import { VOUCHER_PAYMENT_METHODS, VOUCHER_STATUS_LABELS } from '@/constants/entities';
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { fmt } from '@/utils/format/format';
import VoucherFormDialog from './VoucherFormDialog';
import { ConfirmDeleteDialog } from '@/components/common';
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
  const approveMut = useApproveVoucher();
  const voidMut = useVoidVoucher();
  const [formOpen, setFormOpen] = useState(false);
  const [voidTarget, setVoidTarget] = useState<Voucher | null>(null);

  const download = async (pdfPath: string | null) => {
    if (!pdfPath) return toast.error('لم يُصدر PDF بعد — اعتمد السند أولاً');
    const url = await getVoucherSignedUrl(pdfPath);
    if (!url) return toast.error('تعذّر إنشاء رابط التنزيل');
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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

      <ConfirmDeleteDialog
        open={!!voidTarget}
        onOpenChange={(o) => !o && setVoidTarget(null)}
        targetName={voidTarget ? `سند ${voidTarget.voucher_number}` : undefined}
        title="إلغاء سند الصرف"
        confirmLabel="تأكيد الإلغاء"
        requireReason
        reasonLabel="سبب الإلغاء"
        onConfirm={(reason) => {
          if (!voidTarget) return;
          if (!reason?.trim()) return toast.error('سبب الإلغاء مطلوب');
          voidMut.mutate(
            { voucherId: voidTarget.id, reason: reason.trim() },
            { onSettled: () => setVoidTarget(null) },
          );
        }}
      />
    </div>
  );
};

export default VoucherList;
