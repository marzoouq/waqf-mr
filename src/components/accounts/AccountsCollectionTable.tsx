/**
 * جدول تفصيل التحصيل والمتأخرات — المكون الرئيسي
 */
import { useState, useMemo } from 'react';
import { fmt } from '@/utils/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Wallet, Filter } from 'lucide-react';
import type { CollectionItem, EditData } from './collection/types';
import CollectionMobileCard from './collection/CollectionMobileCard';
import CollectionDesktopRow from './collection/CollectionDesktopRow';

// إعادة تصدير الأنواع للتوافق
export type { CollectionItem, EditData };

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
  totalExpectedPayments: _tep, totalPaidMonths: _tpm, totalCollectedAll: _tcAll, totalArrearsAll: _taAll,
  isUpdatePending, isUpsertPending,
}: AccountsCollectionTableProps) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return collectionData;
    return collectionData.filter(item => item.status === statusFilter);
  }, [collectionData, statusFilter]);

  const filteredTotalCollected = useMemo(() => filteredData.reduce((s, d) => s + d.totalCollected, 0), [filteredData]);
  const filteredTotalArrears = useMemo(() => filteredData.reduce((s, d) => s + d.arrears, 0), [filteredData]);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            تفصيل التحصيل والمتأخرات
          </CardTitle>
          {contracts.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-28 h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل ({collectionData.length})</SelectItem>
                  <SelectItem value="مكتمل">مكتمل ({collectionData.filter(d => d.status === 'مكتمل').length})</SelectItem>
                  <SelectItem value="متأخر">متأخر ({collectionData.filter(d => d.status === 'متأخر').length})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد عقود مسجلة</p>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {filteredData.map((item, idx) => (
                <CollectionMobileCard
                  key={item.index}
                  item={item}
                  isEditing={editingIndex === idx}
                  editData={editData}
                  setEditData={setEditData}
                  onStartEdit={() => onStartEdit(idx)}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  isUpdatePending={isUpdatePending}
                  isUpsertPending={isUpsertPending}
                />
              ))}
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">عدد المستأجرين</span>
                  <span className="font-bold">{filteredData.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">إجمالي المحصّل</span>
                  <span className="font-bold text-primary">{fmt(filteredTotalCollected)} ريال</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">إجمالي المتأخرات</span>
                  <span className="font-bold text-destructive">{fmt(filteredTotalArrears)} ريال</span>
                </div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
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
                  {filteredData.map((item, idx) => (
                    <CollectionDesktopRow
                      key={item.index}
                      item={item}
                      isEditing={editingIndex === idx}
                      editData={editData}
                      setEditData={setEditData}
                      onStartEdit={() => onStartEdit(idx)}
                      onCancelEdit={onCancelEdit}
                      onSaveEdit={onSaveEdit}
                      isUpdatePending={isUpdatePending}
                      isUpsertPending={isUpsertPending}
                    />
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="bg-muted/70 font-bold">
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>{filteredData.length} مستأجر</TableCell>
                    <TableCell className="text-primary font-bold">{fmt(filteredData.reduce((sum, d) => sum + d.paymentPerPeriod, 0))} ريال</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-center text-muted-foreground">—</TableCell>
                    <TableCell className="text-primary font-bold">{fmt(filteredTotalCollected)} ريال</TableCell>
                    <TableCell className="text-destructive font-bold">{fmt(filteredTotalArrears)} ريال</TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsCollectionTable;
