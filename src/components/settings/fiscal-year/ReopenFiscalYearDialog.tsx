/**
 * حوار إعادة فتح سنة مالية مقفلة — مستخرج من FiscalYearManagementTab.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, Unlock } from 'lucide-react';
import { uiNotify } from '@/lib/notify';
import type { FiscalYear } from '@/types';

interface Props {
  fy: FiscalYear;
  onConfirm: (reason: string) => void;
  loading: boolean;
}

const ReopenFiscalYearDialog = ({ fy, onConfirm, loading }: Props) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const handleConfirm = () => {
    if (reason.trim().length < 10) {
      uiNotify.error('يجب ذكر سبب واضح لإعادة الفتح (10 أحرف على الأقل)');
      return;
    }
    onConfirm(reason.trim());
    setOpen(false);
    setReason('');
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="gap-1 text-xs text-caution-foreground hover:text-caution-foreground/80" disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlock className="w-3 h-3" />}
          إعادة فتح
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ إعادة فتح سنة مقفلة — عملية حساسة</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-sm">
            <p>إعادة فتح <strong>{fy.label}</strong> ستسمح بتعديل بياناتها المالية المؤرشفة.</p>
            <p className="text-destructive font-medium">هذه العملية تُسجَّل في سجل المراجعة ولا يمكن إخفاؤها.</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5 px-1 pb-1">
          <Label htmlFor="reopen-reason">سبب إعادة الفتح <span className="text-destructive">*</span></Label>
          <Textarea id="reopen-reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="مثال: تصحيح خطأ في قيد دخل الوحدة 3 بتاريخ ..." rows={3} maxLength={500} className="resize-none" />
          <p className="text-xs text-muted-foreground">{reason.trim().length} / 500 — حد أدنى 10 أحرف</p>
        </div>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel onClick={() => setReason('')}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} className="bg-caution hover:bg-caution/90" disabled={reason.trim().length < 10}>تأكيد إعادة الفتح</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReopenFiscalYearDialog;
