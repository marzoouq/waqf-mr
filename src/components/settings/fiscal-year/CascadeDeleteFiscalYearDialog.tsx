/**
 * حوار الحذف الشامل لسنة مالية وكل بياناتها — مستخرج من FiscalYearManagementTab.
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { uiNotify } from '@/lib/notify';
import type { FiscalYear } from '@/types';

interface Props {
  fy: FiscalYear;
  onConfirm: () => void;
  loading: boolean;
}

const CascadeDeleteFiscalYearDialog = ({ fy, onConfirm, loading }: Props) => {
  const [open, setOpen] = useState(false);
  const [selectAll, setSelectAll] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const expected = fy.label;
  const canDelete = selectAll && confirmText.trim() === expected;

  const handleConfirm = () => {
    if (!canDelete) {
      uiNotify.error(`اكتب اسم السنة "${expected}" للتأكيد، وفعّل "تحديد الكل"`);
      return;
    }
    onConfirm();
    setOpen(false);
    setSelectAll(false);
    setConfirmText('');
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setSelectAll(false); setConfirmText(''); } }}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive gap-1 text-xs" disabled={loading} title="حذف السنة وكل بياناتها">
          <AlertTriangle className="w-3 h-3" />
          حذف السنة وكل بياناتها
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">⚠️ حذف شامل — لا يمكن التراجع</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm">
              <p>سيتم حذف السنة <strong>{fy.label}</strong> وجميع بياناتها المرتبطة نهائياً:</p>
              <ul className="list-disc pr-5 text-xs text-muted-foreground space-y-0.5">
                <li>العقود وتخصيصاتها</li>
                <li>فواتير الدفعات والفواتير الضريبية وعناصرها وسلسلتها</li>
                <li>الدخل والمصروفات والميزانيات وسندات الصرف</li>
                <li>التوزيعات وطلبات السلف والرصيد المرحّل</li>
                <li>التقارير السنوية والحسابات الختامية</li>
              </ul>
              <p className="text-destructive font-medium">هذه العملية لا يمكن استرجاعها.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 px-1 pb-1">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={(e) => setSelectAll(e.target.checked)}
              className="w-4 h-4 accent-destructive"
            />
            <span>تحديد الكل — حذف السنة وكل بياناتها</span>
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="cascade-confirm">اكتب <code className="px-1 py-0.5 rounded bg-muted text-destructive">{expected}</code> للتأكيد</Label>
            <Input
              id="cascade-confirm"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={expected}
              disabled={!selectAll}
              autoComplete="off"
            />
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!canDelete}
            className="bg-destructive hover:bg-destructive/90"
          >
            تأكيد الحذف الشامل
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default CascadeDeleteFiscalYearDialog;
