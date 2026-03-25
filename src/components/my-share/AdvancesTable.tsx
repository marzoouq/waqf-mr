/**
 * جدول سجل السُلف — عرض موبايل + سطح مكتب
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Banknote, CheckCircle, Clock, XCircle } from 'lucide-react';
import { fmt } from '@/utils/format';

const getAdvanceStatusBadge = (status: string) => {
  const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
    pending: { label: 'قيد المراجعة', cls: 'bg-warning/20 text-warning', icon: Clock },
    approved: { label: 'معتمد', cls: 'bg-status-approved/20 text-status-approved-foreground', icon: CheckCircle },
    paid: { label: 'مصروف', cls: 'bg-success/20 text-success', icon: Banknote },
    rejected: { label: 'مرفوض', cls: 'bg-destructive/20 text-destructive', icon: XCircle },
  };
  const s = map[status] || { label: status, cls: 'bg-muted text-muted-foreground', icon: Clock };
  const Icon = s.icon;
  return <Badge className={s.cls}><Icon className="w-3 h-3 ml-1" />{s.label}</Badge>;
};

interface Advance {
  id: string;
  amount: number;
  status: string;
  reason: string | null;
  created_at: string;
  paid_at: string | null;
  rejection_reason: string | null;
}

interface Props {
  advances: Advance[];
}

const AdvancesTable = ({ advances }: Props) => {
  if (advances.length === 0) return null;

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="w-5 h-5" />
          سجل السُلف
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile */}
        <div className="space-y-3 md:hidden">
          {advances.map(adv => {
            const borderColor = adv.status === 'paid' ? 'border-r-success' : adv.status === 'approved' ? 'border-r-primary' : adv.status === 'rejected' ? 'border-r-destructive' : 'border-r-warning';
            return (
              <div key={adv.id} className={`border rounded-lg border-r-4 ${borderColor} p-3 space-y-2`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{fmt(Number(adv.amount))} ر.س</span>
                  {getAdvanceStatusBadge(adv.status)}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">التاريخ</p>
                    <p className="font-medium">{new Date(adv.created_at).toLocaleDateString('ar-SA')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">السبب</p>
                    <p className="font-medium truncate">{adv.reason || '—'}</p>
                  </div>
                </div>
                {adv.status === 'paid' && adv.paid_at && (
                  <p className="text-xs text-success">تاريخ الصرف: {new Date(adv.paid_at).toLocaleDateString('ar-SA')}</p>
                )}
                {adv.status === 'rejected' && adv.rejection_reason && (
                  <div className="flex items-start gap-1.5 p-2 bg-destructive/5 rounded text-xs text-destructive">
                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{adv.rejection_reason}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Desktop */}
        <div className="overflow-x-auto hidden md:block">
          <Table className="min-w-[500px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-right">السبب</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {advances.map(adv => (
                <TableRow key={adv.id}>
                  <TableCell>{new Date(adv.created_at).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell className="font-bold">{fmt(Number(adv.amount))} ر.س</TableCell>
                  <TableCell className="max-w-[200px] truncate">{adv.reason || '—'}</TableCell>
                  <TableCell>
                    {getAdvanceStatusBadge(adv.status)}
                    {adv.status === 'rejected' && adv.rejection_reason && (
                      <p className="text-xs text-muted-foreground mt-1">{adv.rejection_reason}</p>
                    )}
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

export default AdvancesTable;
