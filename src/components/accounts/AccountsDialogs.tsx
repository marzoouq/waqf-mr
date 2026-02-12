import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface DeleteTarget {
  type: string;
  id: string;
  name: string;
}

interface EditingContractData {
  id: string;
  tenant_name: string;
  rent_amount: number;
  status: string;
  contract_number: string;
}

interface AccountsDialogsProps {
  deleteTarget: DeleteTarget | null;
  setDeleteTarget: (target: DeleteTarget | null) => void;
  onConfirmDelete: () => void;
  contractEditOpen: boolean;
  setContractEditOpen: (open: boolean) => void;
  editingContractData: EditingContractData | null;
  setEditingContractData: React.Dispatch<React.SetStateAction<EditingContractData | null>>;
  onSaveContractEdit: () => void;
  isUpdatePending: boolean;
}

const AccountsDialogs = ({
  deleteTarget, setDeleteTarget, onConfirmDelete,
  contractEditOpen, setContractEditOpen,
  editingContractData, setEditingContractData,
  onSaveContractEdit, isUpdatePending,
}: AccountsDialogsProps) => {
  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من الحذف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف {deleteTarget?.name} نهائياً ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              تأكيد الحذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Contract Edit Dialog */}
      <Dialog open={contractEditOpen} onOpenChange={setContractEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تعديل العقد {editingContractData?.contract_number}</DialogTitle>
            <DialogDescription className="sr-only">نموذج تعديل بيانات العقد</DialogDescription>
          </DialogHeader>
          {editingContractData && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>اسم المستأجر</Label>
                <Input
                  value={editingContractData.tenant_name}
                  onChange={(e) => setEditingContractData((prev) => prev ? { ...prev, tenant_name: e.target.value } : prev)}
                />
              </div>
              <div className="space-y-2">
                <Label>قيمة الإيجار (ر.س)</Label>
                <Input
                  type="number"
                  value={editingContractData.rent_amount}
                  onChange={(e) => setEditingContractData((prev) => prev ? { ...prev, rent_amount: Number(e.target.value) } : prev)}
                />
              </div>
              <div className="space-y-2">
                <Label>الحالة</Label>
                <Select value={editingContractData.status} onValueChange={(val) => setEditingContractData((prev) => prev ? { ...prev, status: val } : prev)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                    <SelectItem value="cancelled">ملغي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button className="flex-1 gradient-primary" onClick={onSaveContractEdit} disabled={isUpdatePending}>
                  تحديث
                </Button>
                <Button variant="outline" onClick={() => setContractEditOpen(false)}>
                  إلغاء
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AccountsDialogs;
