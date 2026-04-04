/**
 * جدول سجل الفروق المرحّلة — موبايل + سطح مكتب
 */
import { useIsMobile } from '@/hooks/ui/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmt, fmtDate } from '@/utils/format/format';
import { safeNumber } from '@/utils/format/safeNumber';

interface Carryforward {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  from_fiscal_year_id: string;
  to_fiscal_year_id: string | null;
}

interface Props {
  carryforwards: Carryforward[];
  fyLabel: (id: string | null) => string;
}

const CarryforwardsRecordTable = ({ carryforwards, fyLabel }: Props) => {
  const isMobile = useIsMobile();
  return (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">سجل الفروق المرحّلة</CardTitle>
    </CardHeader>
    <CardContent>
      {carryforwards.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">لا توجد فروق مرحّلة</p>
      ) : isMobile ? (
        <div className="space-y-3">
          {carryforwards.map(cf => (
            <div key={cf.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium text-destructive text-sm">{fmt(safeNumber(cf.amount))} ر.س</span>
                <Badge variant={cf.status === 'active' ? 'destructive' : 'default'} className="text-xs">
                  {cf.status === 'active' ? 'نشط' : 'مُسوّى'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                <div>
                  <p className="text-[11px] text-muted-foreground">من سنة</p>
                  <p className="text-xs font-medium">{fyLabel(cf.from_fiscal_year_id)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">إلى سنة</p>
                  <p className="text-xs font-medium">{fyLabel(cf.to_fiscal_year_id)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">التاريخ</p>
                  <p className="text-xs font-medium">{fmtDate(cf.created_at)}</p>
                </div>
                {cf.notes && (
                  <div>
                    <p className="text-[11px] text-muted-foreground">ملاحظات</p>
                    <p className="text-xs font-medium">{cf.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">من السنة المالية</TableHead>
                <TableHead className="text-right">إلى السنة المالية</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">ملاحظات</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carryforwards.map(cf => (
                <TableRow key={cf.id}>
                  <TableCell>{fyLabel(cf.from_fiscal_year_id)}</TableCell>
                  <TableCell>{fyLabel(cf.to_fiscal_year_id)}</TableCell>
                  <TableCell className="font-medium text-destructive">
                    {fmt(safeNumber(cf.amount))} ر.س
                  </TableCell>
                  <TableCell>
                    <Badge variant={cf.status === 'active' ? 'destructive' : 'default'} className="text-xs">
                      {cf.status === 'active' ? 'نشط' : 'مُسوّى'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {cf.notes || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {fmtDate(cf.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
  );
};

export default CarryforwardsRecordTable;
