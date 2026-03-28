/**
 * بطاقة تحصيل موبايل — عنصر واحد
 */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Check, X } from 'lucide-react';
import { fmt } from '@/utils/format';
import type { CollectionRowProps } from './types';

const CollectionMobileCard = ({
  item, isEditing, editData, setEditData,
  onStartEdit, onCancelEdit, onSaveEdit,
  isUpdatePending, isUpsertPending,
}: CollectionRowProps) => {
  const editRent = editData?.monthlyRent ?? item.paymentPerPeriod;
  const editPaid = editData?.paidMonths ?? item.paidMonths;
  const editTotal = editRent * editPaid;
  const editArrears = Math.max(0, (editRent * item.expectedPayments) - editTotal);

  return (
    <div className="p-3 rounded-lg border bg-card space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isEditing ? (
              <Input name="tenantName" value={editData?.tenantName ?? ''}
                onChange={(e) => setEditData(prev => prev ? { ...prev, tenantName: e.target.value } : prev)}
                className="h-8 w-full"
              />
            ) : (
              <>
                <span className="font-bold text-sm">{item.tenantName}</span>
                <Badge variant={item.status === 'مكتمل' ? 'default' : 'destructive'} className="text-xs">
                  {isEditing ? editData?.status : item.status}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {isEditing ? (
            <>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={onSaveEdit} disabled={isUpdatePending || isUpsertPending}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={onCancelEdit}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onStartEdit}>
              <Pencil className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {isEditing && (
        <Select
          value={editData?.status ?? 'متأخر'}
          onValueChange={(val) => setEditData(prev => prev ? { ...prev, status: val } : prev)}
        >
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="مكتمل">مكتمل</SelectItem>
            <SelectItem value="متأخر">متأخر</SelectItem>
          </SelectContent>
        </Select>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <div>
          <p className="text-[11px] text-muted-foreground">الإيجار الشهري</p>
          {isEditing ? (
            <Input name="monthlyRent" type="number" value={editData?.monthlyRent ?? 0}
              onChange={(e) => setEditData(prev => prev ? { ...prev, monthlyRent: Number(e.target.value) } : prev)}
              className="h-8 w-full mt-0.5"
            />
          ) : (
            <p className="text-sm font-bold text-primary">{fmt(item.paymentPerPeriod)} ريال</p>
          )}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">الدفعات المحصّلة</p>
          {isEditing ? (
            <Input name="paidMonths" type="number" min={0} max={item.expectedPayments}
              value={editData?.paidMonths ?? 0}
              onChange={(e) => setEditData(prev => prev ? { ...prev, paidMonths: Number(e.target.value) } : prev)}
              className="h-8 w-full mt-0.5"
            />
          ) : (
            <p className="text-sm font-medium">
              {item.paidMonths}
              {item.spansMultipleYears && (
                <span className="text-xs text-muted-foreground"> / {item.expectedPayments}</span>
              )}
            </p>
          )}
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">الإجمالي المحصّل</p>
          <p className="text-sm font-bold text-primary">
            {fmt(isEditing ? editTotal : item.totalCollected)} ريال
          </p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">المتأخرات</p>
          <p className={`text-sm font-bold ${(isEditing ? editArrears : item.arrears) > 0 ? 'text-destructive' : 'text-success'}`}>
            {fmt(isEditing ? editArrears : item.arrears)} ريال
          </p>
        </div>
      </div>
    </div>
  );
};

export default CollectionMobileCard;
