/**
 * جدول سجل السُلف المصروفة — عرض واحد حسب الشاشة
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fmt, fmtDate } from '@/utils/format';
import { safeNumber } from '@/utils/safeNumber';
import { useIsDesktop } from '@/hooks/ui/useIsDesktop';

interface Advance {
  id: string;
  amount: number;
  reason: string | null;
  paid_at: string | null;
  created_at: string;
}

interface Props {
  paidAdvances: Advance[];
}

const PaidAdvancesTable = ({ paidAdvances }: Props) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">سجل السُلف المصروفة</CardTitle>
    </CardHeader>
    <CardContent>
      {paidAdvances.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">لا توجد سُلف مصروفة</p>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="space-y-3 md:hidden">
            {paidAdvances.map(adv => (
              <div key={adv.id} className="border rounded-lg p-3 space-y-2">
                <p className="font-medium text-sm">{fmt(safeNumber(adv.amount))} ر.س</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div>
                    <p className="text-[11px] text-muted-foreground">السبب</p>
                    <p className="text-xs font-medium">{adv.reason || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">تاريخ الصرف</p>
                    <p className="text-xs font-medium">{adv.paid_at ? fmtDate(adv.paid_at) : '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">تاريخ الطلب</p>
                    <p className="text-xs font-medium">{fmtDate(adv.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Desktop Table */}
          <div className="overflow-x-auto hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">المبلغ</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="text-right">تاريخ الصرف</TableHead>
                  <TableHead className="text-right">تاريخ الطلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paidAdvances.map(adv => (
                  <TableRow key={adv.id}>
                    <TableCell className="font-medium">
                      {fmt(safeNumber(adv.amount))} ر.س
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">
                      {adv.reason || '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {adv.paid_at ? fmtDate(adv.paid_at) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDate(adv.created_at)}
                    </TableCell>
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

export default PaidAdvancesTable;
