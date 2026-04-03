/**
 * حوار تجديد العقود الجماعي
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefreshCw, CheckCircle } from 'lucide-react';

interface BulkRenewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contracts: Array<{ id: string; contract_number: string; tenant_name: string }>;
  selectedIds: Set<string>;
  isRenewing: boolean;
  onConfirm: () => void;
}

export default function BulkRenewDialog({ open, onOpenChange, contracts, selectedIds, isRenewing, onConfirm }: BulkRenewDialogProps) {
  const selected = contracts.filter(c => selectedIds.has(c.id));
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>تجديد العقود المختارة ({selectedIds.size})</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>سيتم إنشاء عقود جديدة بنفس البيانات مع تواريخ تبدأ من تاريخ انتهاء العقد السابق وبنفس المدة للعقود التالية:</p>
              <ul className="max-h-40 overflow-y-auto space-y-1 text-sm pr-2">
                {selected.map(c => (
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
          <AlertDialogCancel disabled={isRenewing}>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isRenewing} className="bg-success text-success-foreground hover:bg-success/90 gap-2">
            {isRenewing ? 'جاري التجديد...' : <><RefreshCw className="w-4 h-4" />تأكيد التجديد ({selectedIds.size})</>}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
