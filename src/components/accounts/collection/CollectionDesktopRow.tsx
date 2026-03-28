/**
 * صف جدول التحصيل — سطح المكتب
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TableRow, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Pencil, Check, X, CalendarRange } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { CollectionRowProps } from './types';

const CollectionDesktopRow = ({
  item, isEditing, editData, setEditData,
  onStartEdit, onCancelEdit, onSaveEdit,
  isUpdatePending, isUpsertPending,
}: CollectionRowProps) => {
  const editRent = editData?.monthlyRent ?? item.paymentPerPeriod;
  const editPaid = editData?.paidMonths ?? item.paidMonths;
  const editTotal = editRent * editPaid;
  const editArrears = Math.max(0, (editRent * item.expectedPayments) - editTotal);

  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{item.index}</TableCell>
      <TableCell className="font-medium">
        {isEditing ? (
          <Input name="tenantName" value={editData?.tenantName ?? ''}
            onChange={(e) => setEditData(prev => prev ? { ...prev, tenantName: e.target.value } : prev)}
            className="h-8 w-32"
          />
        ) : item.tenantName}
      </TableCell>
      <TableCell className="font-bold text-primary">
        {isEditing ? (
          <Input name="monthlyRent" type="number" value={editData?.monthlyRent ?? 0}
            onChange={(e) => setEditData(prev => prev ? { ...prev, monthlyRent: Number(e.target.value) } : prev)}
            className="h-8 w-24"
          />
        ) : `${fmt(item.paymentPerPeriod)} ريال`}
      </TableCell>
      <TableCell className="text-center">
        {item.spansMultipleYears ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1 cursor-help">
                  <CalendarRange className="w-3.5 h-3.5 text-warning" />
                  <span className="font-bold">{item.expectedPayments}</span>
                  <span className="text-muted-foreground text-xs">/ {item.totalContractPayments}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-right">
                <p className="font-bold mb-1">هذا العقد يمتد على أكثر من سنة مالية</p>
                <p>المخصص لهذه السنة: {item.allocatedToThisYear} دفعات</p>
                <p>المخصص لسنة أخرى: {item.allocatedToOtherYears} دفعات</p>
                <p className="text-muted-foreground mt-1">إجمالي العقد: {item.totalContractPayments} دفعة</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          item.expectedPayments
        )}
      </TableCell>
      <TableCell className="text-center">
        {isEditing ? (
          <Input name="paidMonths" type="number" min={0} max={item.expectedPayments}
            value={editData?.paidMonths ?? 0}
            onChange={(e) => setEditData(prev => prev ? { ...prev, paidMonths: Number(e.target.value) } : prev)}
            className="h-8 w-16"
          />
        ) : item.paidMonths}
      </TableCell>
      <TableCell className="font-bold text-primary">
        {isEditing ? `${fmt(editTotal)} ريال` : `${fmt(item.totalCollected)} ريال`}
      </TableCell>
      <TableCell className={`font-bold ${(isEditing ? editArrears : item.arrears) > 0 ? 'text-destructive' : 'text-success'}`}>
        {fmt(isEditing ? editArrears : item.arrears)} ريال
      </TableCell>
      <TableCell>
        {isEditing ? (
          <Select
            value={editData?.status ?? 'متأخر'}
            onValueChange={(val) => setEditData(prev => prev ? { ...prev, status: val } : prev)}
          >
            <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
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
            <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={onSaveEdit} disabled={isUpdatePending || isUpsertPending}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={onCancelEdit}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ) : (
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onStartEdit}>
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
};

export default CollectionDesktopRow;
