import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Wallet, Pencil, Check, X } from 'lucide-react';

export interface CollectionItem {
  index: number;
  tenantName: string;
  paymentPerPeriod: number;
  expectedPayments: number;
  paidMonths: number;
  totalCollected: number;
  arrears: number;
  status: string;
  notes: string;
}

interface EditData {
  tenantName: string;
  monthlyRent: number;
  paidMonths: number;
  status: string;
}

interface AccountsCollectionTableProps {
  contracts: { length: number };
  collectionData: CollectionItem[];
  editingIndex: number | null;
  editData: EditData | null;
  setEditData: React.Dispatch<React.SetStateAction<EditData | null>>;
  onStartEdit: (index: number) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  totalExpectedPayments: number;
  totalPaidMonths: number;
  totalCollectedAll: number;
  totalArrearsAll: number;
  isUpdatePending: boolean;
  isUpsertPending: boolean;
}

const AccountsCollectionTable = ({
  contracts, collectionData, editingIndex, editData, setEditData,
  onStartEdit, onCancelEdit, onSaveEdit,
  totalExpectedPayments, totalPaidMonths, totalCollectedAll, totalArrearsAll,
  isUpdatePending, isUpsertPending,
}: AccountsCollectionTableProps) => {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5" />
          تفصيل التحصيل والمتأخرات
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
        ) : (
          <div className="overflow-x-auto">
          <Table className="min-w-[850px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right w-12">#</TableHead>
                <TableHead className="text-right">المستأجر</TableHead>
                <TableHead className="text-right">الإيجار الشهري</TableHead>
                <TableHead className="text-right">الدفعات المتوقعة</TableHead>
                <TableHead className="text-right">الدفعات المحصّلة</TableHead>
                <TableHead className="text-right">الإجمالي المحصّل</TableHead>
                <TableHead className="text-right">المتأخرات</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right w-24">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectionData.map((item, idx) => {
                const isEditing = editingIndex === idx;
                const editRent = editData?.monthlyRent ?? item.paymentPerPeriod;
                const editPaid = editData?.paidMonths ?? item.paidMonths;
                const editTotal = editRent * editPaid;
                // N-08 fix: clamp arrears to zero to prevent negative display
                const editArrears = Math.max(0, (editRent * item.expectedPayments) - editTotal);

                return (
                  <TableRow key={item.index}>
                    <TableCell className="text-muted-foreground">{item.index}</TableCell>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <Input
                          value={editData?.tenantName ?? ''}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, tenantName: e.target.value } : prev)}
                          className="h-8 w-32"
                        />
                      ) : item.tenantName}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={editData?.monthlyRent ?? 0}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, monthlyRent: Number(e.target.value) } : prev)}
                          className="h-8 w-24"
                        />
                      ) : `${item.paymentPerPeriod.toLocaleString()} ريال`}
                    </TableCell>
                    <TableCell className="text-center">{item.expectedPayments}</TableCell>
                    <TableCell className="text-center">
                      {isEditing ? (
                        <Input
                          type="number"
                          min={0}
                          max={item.expectedPayments}
                          value={editData?.paidMonths ?? 0}
                          onChange={(e) => setEditData(prev => prev ? { ...prev, paidMonths: Number(e.target.value) } : prev)}
                          className="h-8 w-16"
                        />
                      ) : item.paidMonths}
                    </TableCell>
                    <TableCell className="font-bold text-primary">
                      {isEditing ? `${editTotal.toLocaleString()} ريال` : `${item.totalCollected.toLocaleString()} ريال`}
                    </TableCell>
                    <TableCell className={`font-bold ${(isEditing ? editArrears : item.arrears) > 0 ? 'text-destructive' : 'text-success'}`}>
                      {(isEditing ? editArrears : item.arrears).toLocaleString()} ريال
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select
                          value={editData?.status ?? 'متأخر'}
                          onValueChange={(val) => setEditData(prev => prev ? { ...prev, status: val } : prev)}
                        >
                          <SelectTrigger className="h-8 w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="مكتمل">مكتمل</SelectItem>
                            <SelectItem value="متأخر">متأخر</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'مكتمل' ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'}`}>
                          {item.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => onSaveEdit()} disabled={isUpdatePending || isUpsertPending}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onCancelEdit}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStartEdit(idx)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="bg-muted/70 font-bold">
                <TableCell>الإجمالي</TableCell>
                <TableCell>{contracts.length} مستأجر</TableCell>
                <TableCell className="text-primary font-bold">{collectionData.reduce((sum, d) => sum + d.paymentPerPeriod, 0).toLocaleString()} ريال</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-center text-muted-foreground">—</TableCell>
                <TableCell className="text-primary font-bold">{totalCollectedAll.toLocaleString()} ريال</TableCell>
                <TableCell className="text-destructive font-bold">{totalArrearsAll.toLocaleString()} ريال</TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsCollectionTable;
