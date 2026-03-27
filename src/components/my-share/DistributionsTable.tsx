/**
 * جدول سجل التوزيعات — عرض موبايل (بطاقات) + سطح مكتب (جدول)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import { fmt, fmtDate } from '@/utils/format';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'paid':
      return <Badge className="bg-success/20 text-success hover:bg-success/30"><CheckCircle className="w-3 h-3 ml-1" /> مستلم</Badge>;
    case 'pending':
      return <Badge className="bg-warning/20 text-warning hover:bg-warning/30"><Clock className="w-3 h-3 ml-1" /> معلق</Badge>;
    case 'cancelled':
      return <Badge className="bg-destructive/20 text-destructive hover:bg-destructive/30"><XCircle className="w-3 h-3 ml-1" /> ملغى</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

interface Distribution {
  id: string;
  date: string;
  amount: number;
  status: string;
  account?: { fiscal_year?: string } | null;
}

interface Props {
  distributions: Distribution[];
}

const DistributionsTable = ({ distributions }: Props) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle>سجل التوزيعات</CardTitle>
    </CardHeader>
    <CardContent>
      {distributions.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد توزيعات مسجلة بعد</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {distributions.map((dist) => (
              <div key={dist.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{fmt(Number(dist.amount))} ر.س</span>
                  {getStatusBadge(dist.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">التاريخ</p>
                    <p className="font-medium">{fmtDate(dist.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">السنة المالية</p>
                    <p className="font-medium">{dist.account?.fiscal_year || '-'}</p>
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
                  <TableHead className="text-right">السنة المالية</TableHead>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {distributions.map((dist) => (
                  <TableRow key={dist.id}>
                    <TableCell>{fmtDate(dist.date)}</TableCell>
                    <TableCell>{dist.account?.fiscal_year || '-'}</TableCell>
                    <TableCell className="font-bold">{fmt(Number(dist.amount))} ر.س</TableCell>
                    <TableCell>{getStatusBadge(dist.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

export default DistributionsTable;
