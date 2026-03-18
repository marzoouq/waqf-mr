import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import CloseYearChecklist from './CloseYearChecklist';
import { buildClosureChecklist } from './closeYearChecklist.utils';
import { useMemo } from 'react';

interface CloseYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isClosing: boolean;
  fyLabel?: string;
  waqfCorpusManual: number;
  /** M-01: financial summary data for confirmation display */
  totalIncome?: number;
  totalExpenses?: number;
  netAfterExpenses?: number;
  availableAmount?: number;
  distributionsAmount?: number;
  /** A-1: checklist data */
  hasAccount?: boolean;
  pendingAdvances?: number;
  unpaidInvoices?: number;
  beneficiaryPercentage?: number;
}

const SummaryRow = ({ label, value, className }: { label: string; value: number; className?: string }) => (
  <li className="flex justify-between text-sm">
    <span>{label}</span>
    <span className={className || 'font-medium'}>{value.toLocaleString()} ر.س</span>
  </li>
);

const CloseYearDialog = ({
  open, onOpenChange, onConfirm, isClosing, fyLabel, waqfCorpusManual,
  totalIncome = 0, totalExpenses = 0, netAfterExpenses = 0,
  availableAmount = 0, distributionsAmount = 0,
  hasAccount = false, pendingAdvances = 0, unpaidInvoices = 0, beneficiaryPercentage = 0,
}: CloseYearDialogProps) => {
  // A-1: بناء قائمة التحقق
  const checklist = useMemo(() => buildClosureChecklist({
    totalIncome,
    totalExpenses,
    hasAccount,
    distributionsAmount,
    availableAmount,
    pendingAdvances,
    unpaidInvoices,
    beneficiaryPercentage,
  }), [totalIncome, totalExpenses, hasAccount, distributionsAmount, availableAmount, pendingAdvances, unpaidInvoices, beneficiaryPercentage]);

  return (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>تأكيد إقفال السنة المالية</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3 text-sm text-muted-foreground">
            {/* A-1: قائمة التحقق */}
            <CloseYearChecklist items={checklist} />

            {/* M-01: Financial summary before confirmation */}
            {(totalIncome > 0 || totalExpenses > 0) && (
              <ul className="space-y-1.5 rounded-md border p-3 bg-muted/30">
                <SummaryRow label="إجمالي الدخل" value={totalIncome} className="font-medium text-success" />
                <SummaryRow label="إجمالي المصروفات" value={totalExpenses} className="font-medium text-destructive" />
                <SummaryRow label="صافي بعد المصروفات" value={netAfterExpenses} />
                <SummaryRow label="المتاح للتوزيع" value={availableAmount} className="font-medium text-primary" />
                {distributionsAmount > 0 && (
                  <SummaryRow label="الموزَّع فعلياً" value={distributionsAmount} />
                )}
              </ul>
            )}
            <p>سيتم تنفيذ الخطوات التالية عند تأكيد الإقفال:</p>
            <ul className="list-disc list-inside space-y-1 mr-2">
              <li>حفظ الحساب الختامي النهائي وأرشفة جميع البيانات للسنة <strong className="text-foreground">{fyLabel}</strong></li>
              <li>إقفال السنة المالية نهائياً (لن يمكن التعديل بعد الإقفال)</li>
              <li>ترحيل رقبة الوقف <strong className="text-foreground">({waqfCorpusManual.toLocaleString()} ر.س)</strong> للسنة الجديدة</li>
              <li>إشعار جميع المستفيدين بإقفال السنة</li>
            </ul>
            <p className="text-xs mt-2">جميع البيانات المؤرشفة ستبقى متاحة للاطلاع عليها.</p>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row-reverse gap-2">
        <AlertDialogCancel disabled={isClosing}>إلغاء</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          disabled={isClosing}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {isClosing ? 'جاري الإقفال...' : 'تأكيد الإقفال'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
  );
};

export default CloseYearDialog;
