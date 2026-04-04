import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { fmt } from '@/utils/format/format';

interface YoYComparisonTableProps {
  comparisonData: Record<string, unknown>[];
  year1Label: string;
  year2Label: string;
  yearTotals: {
    year1: { income: number; expenses: number; net: number };
    year2: { income: number; expenses: number; net: number };
  };
}

/** جدول المقارنة التفصيلي — عرض جوال + ديسكتوب */
const YoYComparisonTable = ({ comparisonData, year1Label, year2Label, yearTotals }: YoYComparisonTableProps) => {
  const netDiff = yearTotals.year2.net - yearTotals.year1.net;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm sm:text-base">جدول المقارنة التفصيلي</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile cards */}
        <div className="space-y-2 md:hidden">
          {comparisonData.map((row) => {
            const diff = (row.net2 as number) - (row.net1 as number);
            return (
              <div key={row.month as string} className="p-3 rounded-lg border bg-card space-y-2">
                <p className="text-sm font-bold">{row.month as string}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1 p-2 rounded bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">{year1Label}</p>
                    <p className="text-success">دخل: {fmt(row[`دخل ${year1Label}`] as number)}</p>
                    <p className="text-destructive">مصروفات: {fmt(row[`مصروفات ${year1Label}`] as number)}</p>
                    <p className="font-bold">صافي: {fmt(row.net1 as number)}</p>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-muted/30">
                    <p className="text-[11px] text-muted-foreground">{year2Label}</p>
                    <p className="text-success">دخل: {fmt(row[`دخل ${year2Label}`] as number)}</p>
                    <p className="text-destructive">مصروفات: {fmt(row[`مصروفات ${year2Label}`] as number)}</p>
                    <p className="font-bold">صافي: {fmt(row.net2 as number)}</p>
                  </div>
                </div>
                <div className={`text-center text-xs font-bold ${diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''}`}>
                  الفرق: {diff > 0 ? '+' : ''}{fmt(diff)} ر.س
                </div>
              </div>
            );
          })}
          {/* Mobile totals */}
          <div className="p-3 rounded-lg border-2 border-primary/30 bg-primary/5 space-y-2">
            <p className="text-sm font-bold text-center">الإجمالي</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1 p-2 rounded bg-muted/30">
                <p className="text-[11px] text-muted-foreground">{year1Label}</p>
                <p className="font-bold">{fmt(yearTotals.year1.net)} ر.س</p>
              </div>
              <div className="space-y-1 p-2 rounded bg-muted/30">
                <p className="text-[11px] text-muted-foreground">{year2Label}</p>
                <p className="font-bold">{fmt(yearTotals.year2.net)} ر.س</p>
              </div>
            </div>
            <div className={`text-center text-xs font-bold ${netDiff > 0 ? 'text-success' : 'text-destructive'}`}>
              فرق الصافي: {netDiff > 0 ? '+' : ''}{fmt(netDiff)} ر.س
            </div>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right" rowSpan={2}>الشهر</TableHead>
                <TableHead className="text-center border-x" colSpan={3}>
                  <Badge variant="outline">{year1Label}</Badge>
                </TableHead>
                <TableHead className="text-center border-x" colSpan={3}>
                  <Badge variant="secondary">{year2Label}</Badge>
                </TableHead>
                <TableHead className="text-right">الفرق</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="text-right text-xs">الدخل</TableHead>
                <TableHead className="text-right text-xs">المصروفات</TableHead>
                <TableHead className="text-right text-xs border-l">الصافي</TableHead>
                <TableHead className="text-right text-xs">الدخل</TableHead>
                <TableHead className="text-right text-xs">المصروفات</TableHead>
                <TableHead className="text-right text-xs border-l">الصافي</TableHead>
                <TableHead className="text-right text-xs">في الصافي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {comparisonData.map((row) => {
                const diff = (row.net2 as number) - (row.net1 as number);
                return (
                  <TableRow key={row.month as string}>
                    <TableCell className="font-medium">{row.month as string}</TableCell>
                    <TableCell className="text-success text-xs">{fmt(row[`دخل ${year1Label}`] as number)}</TableCell>
                    <TableCell className="text-destructive text-xs">{fmt(row[`مصروفات ${year1Label}`] as number)}</TableCell>
                    <TableCell className="font-bold text-xs border-l">{fmt(row.net1 as number)}</TableCell>
                    <TableCell className="text-success text-xs">{fmt(row[`دخل ${year2Label}`] as number)}</TableCell>
                    <TableCell className="text-destructive text-xs">{fmt(row[`مصروفات ${year2Label}`] as number)}</TableCell>
                    <TableCell className="font-bold text-xs border-l">{fmt(row.net2 as number)}</TableCell>
                    <TableCell className={`font-bold text-xs ${diff > 0 ? 'text-success' : diff < 0 ? 'text-destructive' : ''}`}>
                      {diff > 0 ? '+' : ''}{fmt(diff)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-bold">الإجمالي</TableCell>
                <TableCell className="font-bold text-success text-xs">{fmt(yearTotals.year1.income)}</TableCell>
                <TableCell className="font-bold text-destructive text-xs">{fmt(yearTotals.year1.expenses)}</TableCell>
                <TableCell className="font-bold text-xs border-l">{fmt(yearTotals.year1.net)}</TableCell>
                <TableCell className="font-bold text-success text-xs">{fmt(yearTotals.year2.income)}</TableCell>
                <TableCell className="font-bold text-destructive text-xs">{fmt(yearTotals.year2.expenses)}</TableCell>
                <TableCell className="font-bold text-xs border-l">{fmt(yearTotals.year2.net)}</TableCell>
                <TableCell className={`font-bold text-xs ${netDiff > 0 ? 'text-success' : 'text-destructive'}`}>
                  {netDiff > 0 ? '+' : ''}{fmt(netDiff)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default YoYComparisonTable;
