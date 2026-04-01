/**
 * حوارات صفحة العقود — التجديد الجماعي + الحذف
 */
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Contract } from '@/types/database';

interface Props {
  // حوار التجديد الجماعي
  bulkRenewOpen: boolean;
  setBulkRenewOpen: (open: boolean) => void;
  bulkRenewing: boolean;
  selectedForRenewal: Set<string>;
  expiredContracts: Contract[];
  onBulkRenew: () => void;
  // حوار الحذف
  deleteTarget: { id: string; name: string } | null;
  setDeleteTarget: (target: { id: string; name: string } | null) => void;
  onConfirmDelete: () => void;
}

export default function ContractsDialogs({
  bulkRenewOpen, setBulkRenewOpen, bulkRenewing, selectedForRenewal, expiredContracts, onBulkRenew,
  deleteTarget, setDeleteTarget, onConfirmDelete,
}: Props) {
  return (
    <>
      <AlertDialog open={bulkRenewOpen} onOpenChange={setBulkRenewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تجديد العقود المختارة ({selectedForRenewal.size})</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>سيتم إنشاء عقود جديدة بنفس البيانات مع تواريخ تبدأ من تاريخ انتهاء العقد السابق وبنفس المدة للعقود التالية:</p>
                <ul className="max-h-40 overflow-y-auto space-y-1 text-sm pr-2">
                  {expiredContracts.filter(c => selectedForRenewal.has(c.id)).map(c => (
                    <li key={c.id} className="flex items-center gap-2 py-1 border-b border-border/50 last:border-0">
                      <CheckCircle className="w-3.5 h-3.5 text-success shrink-0" />
                      <span className="font-medium">{c.contract_number}</span>
                      <span className="text-muted-foreground">— {c.tenant_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel disabled={bulkRenewing}>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onBulkRenew} disabled={bulkRenewing} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
              {bulkRenewing ? 'جاري التجديد...' : <><RefreshCw className="w-4 h-4" />تأكيد التجديد ({selectedForRenewal.size})</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">تأكيد الحذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
