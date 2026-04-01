/**
 * جدول التدفق النقدي الشهري (موبايل + سطح المكتب)
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import type { CashFlowMonth, CashFlowTotals } from '@/hooks/reports/useCashFlowData';

interface Props {
  monthlyData: CashFlowMonth[];
  totals: CashFlowTotals;
  fmt: (v: number) => string;
}

const CashFlowTable = ({ monthlyData, totals, fmt }: Props) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="text-base">جدول التدفق النقدي الشهري</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {monthlyData.map((row) => (
          <div key={row.month} className="p-3 rounded-lg border bg-card space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-medium text-sm">{row.month}</span>
              <span className={`text-xs font-bold ${row.cumulative >= 0 ? 'text-primary' : 'text-destructive'}`}>
                تراكمي: {fmt(row.cumulative)}
              </span>
            </div>
            <div className="flex gap-3 text-xs">
              <span className="text-success">+{fmt(row.income)}</span>
              <span className="text-destructive">-{fmt(row.expenses)}</span>
              <span className={`font-medium ${row.net >= 0 ? 'text-success' : 'text-destructive'}`}>
                صافي: {fmt(row.net)}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border font-bold text-sm">
          <span>الإجمالي</span>
          <div className="flex gap-3 text-xs">
            <span className="text-success">{fmt(totals.totalIncome)}</span>
            <span className="text-destructive">{fmt(totals.totalExpenses)}</span>
            <span className={totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}>{fmt(totals.totalNet)}</span>
          </div>
        </div>
      </div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>الشهر</TableHead>
              <TableHead>التدفقات الداخلة</TableHead>
              <TableHead>التدفقات الخارجة</TableHead>
              <TableHead>صافي الشهر</TableHead>
              <TableHead>الرصيد التراكمي</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {monthlyData.map((row) => (
              <TableRow key={row.month}>
                <TableCell className="font-medium">{row.month}</TableCell>
                <TableCell className="text-success">{fmt(row.income)}</TableCell>
                <TableCell className="text-destructive">{fmt(row.expenses)}</TableCell>
                <TableCell className={row.net >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                  {fmt(row.net)}
                </TableCell>
                <TableCell className={row.cumulative >= 0 ? 'text-primary font-bold' : 'text-destructive font-bold'}>
                  {fmt(row.cumulative)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/70 font-bold">
              <TableCell>الإجمالي</TableCell>
              <TableCell className="text-success">{fmt(totals.totalIncome)}</TableCell>
              <TableCell className="text-destructive">{fmt(totals.totalExpenses)}</TableCell>
              <TableCell className={totals.totalNet >= 0 ? 'text-success' : 'text-destructive'}>
                {fmt(totals.totalNet)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default CashFlowTable;
