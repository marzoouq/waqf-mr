import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Clock } from 'lucide-react';

interface IdleTimeoutWarningProps {
  open: boolean;
  remaining: number;
  onStayActive: () => void;
}

const IdleTimeoutWarning = ({ open, remaining, onStayActive }: IdleTimeoutWarningProps) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent dir="rtl" className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Clock className="w-5 h-5" />
            تنبيه انتهاء الجلسة
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base">
            ستنتهي جلستك بسبب عدم النشاط خلال{' '}
            <span className="font-bold text-destructive text-lg">{remaining}</span>{' '}
            ثانية. اضغط "متابعة" للبقاء متصلاً.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse sm:flex-row-reverse gap-2">
          <AlertDialogAction onClick={onStayActive}>
            متابعة العمل
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default IdleTimeoutWarning;
