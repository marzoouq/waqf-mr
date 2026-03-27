/**
 * جدول الفروق المرحّلة — عرض موبايل + سطح مكتب
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format';

interface Carryforward {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Props {
  carryforwards: Carryforward[];
}

const CarryforwardsTable = ({ carryforwards }: Props) => {
  if (carryforwards.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          سجل الفروق المرحّلة
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile */}
        <div className="space-y-3 md:hidden">
          {carryforwards.map(cf => (
            <div key={cf.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-destructive">{fmt(Number(cf.amount))} ر.س</span>
                <Badge className={cf.status === 'active' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
                  {cf.status === 'active' ? 'نشط' : 'تمت التسوية'}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">التاريخ</p>
                  <p className="font-medium">{fmtDate(cf.created_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ملاحظات</p>
                  <p className="font-medium truncate">{cf.notes || '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        {/* Desktop */}
        <div className="overflow-x-auto hidden md:block">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {carryforwards.map(cf => (
                <TableRow key={cf.id}>
                  <TableCell>{fmtDate(cf.created_at)}</TableCell>
                  <TableCell className="font-bold text-destructive">{fmt(Number(cf.amount))} ر.س</TableCell>
                  <TableCell>
                    <Badge className={cf.status === 'active' ? 'bg-warning/20 text-warning' : 'bg-success/20 text-success'}>
                      {cf.status === 'active' ? 'نشط' : 'تمت التسوية'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                    {cf.notes || '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarryforwardsTable;
