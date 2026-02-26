import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CloseYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isClosing: boolean;
  fyLabel?: string;
  waqfCorpusManual: number;
}

const CloseYearDialog = ({ open, onOpenChange, onConfirm, isClosing, fyLabel, waqfCorpusManual }: CloseYearDialogProps) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>تأكيد إقفال السنة المالية</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-2 text-sm text-muted-foreground">
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

export default CloseYearDialog;
