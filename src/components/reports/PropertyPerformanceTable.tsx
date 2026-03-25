/**
 * جدول مقارنة أداء العقارات — مستخرج من ReportsPage
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { TrendingUp } from 'lucide-react';
import { fmt } from '@/utils/format';

interface PropertyPerf {
  id: string;
  name: string;
  type: string;
  totalUnits: number;
  occupancy: number;
  annualRent: number;
  totalExpenses: number;
  netIncome: number;
}

interface PerfTotals {
  totalUnits: number;
  annualRent: number;
  totalExpenses: number;
  netIncome: number;
}

interface Props {
  propertyPerformance: PropertyPerf[];
  perfTotals: PerfTotals;
}

const PropertyPerformanceTable = ({ propertyPerformance, perfTotals }: Props) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        مقارنة أداء العقارات
      </CardTitle>
    </CardHeader>
    <CardContent>
      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {propertyPerformance.map((p) => {
          const occupancyColor = p.occupancy >= 80 ? 'text-success' : p.occupancy >= 50 ? 'text-warning' : 'text-destructive';
          return (
            <Card key={p.id} className="shadow-sm">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{p.name}</span>
                  <span className={`text-xs font-semibold ${occupancyColor}`}>{p.occupancy}%</span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-[11px] text-muted-foreground">النوع</p>
                    <p className="text-sm">{p.type}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">الوحدات</p>
                    <p className="text-sm">{p.totalUnits > 0 ? p.totalUnits : (p.occupancy === 100 ? 'كامل' : '-')}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">الإيجار السنوي</p>
                    <p className="text-sm font-medium">{fmt(p.annualRent, 0)} ر.س</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">المصروفات</p>
                    <p className="text-sm text-destructive">{fmt(p.totalExpenses, 0)} ر.س</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-muted-foreground">صافي الدخل</p>
                    <p className={`text-sm font-bold ${p.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(p.netIncome, 0)} ر.س</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-right">#</TableHead>
              <TableHead className="text-right">العقار</TableHead>
              <TableHead className="text-right">النوع</TableHead>
              <TableHead className="text-right">الوحدات</TableHead>
              <TableHead className="text-right min-w-[150px]">نسبة الإشغال</TableHead>
              <TableHead className="text-right">الإيجار السنوي</TableHead>
              <TableHead className="text-right">المصروفات</TableHead>
              <TableHead className="text-right">صافي الدخل</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propertyPerformance.map((p, index) => {
              const occupancyColor = p.occupancy >= 80 ? 'text-success' : p.occupancy >= 50 ? 'text-warning' : 'text-destructive';
              const progressColor = p.occupancy >= 80 ? '[&>div]:bg-success' : p.occupancy >= 50 ? '[&>div]:bg-warning' : '[&>div]:bg-destructive';
              return (
                <TableRow key={p.id} className={index % 2 === 0 ? '' : 'bg-muted/30'}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell className="font-bold">{p.name}</TableCell>
                  <TableCell>{p.type}</TableCell>
                  <TableCell>{p.totalUnits > 0 ? p.totalUnits : (p.occupancy === 100 ? 'كامل' : '-')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={p.occupancy} className={`h-2 flex-1 ${progressColor}`} />
                      <span className={`text-xs font-semibold whitespace-nowrap ${occupancyColor}`}>{p.occupancy}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{fmt(p.annualRent, 0)} ر.س</TableCell>
                  <TableCell className="text-destructive">{fmt(p.totalExpenses, 0)} ر.س</TableCell>
                  <TableCell className={`font-bold ${p.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {fmt(p.netIncome, 0)} ر.س
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="bg-muted/70 font-bold">
              <TableCell colSpan={3}>الإجمالي</TableCell>
              <TableCell>{perfTotals.totalUnits > 0 ? perfTotals.totalUnits : '-'}</TableCell>
              <TableCell></TableCell>
              <TableCell className="font-bold">{fmt(perfTotals.annualRent, 0)} ر.س</TableCell>
              <TableCell className="text-destructive font-bold">{fmt(perfTotals.totalExpenses, 0)} ر.س</TableCell>
              <TableCell className={`font-bold ${perfTotals.netIncome >= 0 ? 'text-success' : 'text-destructive'}`}>
                {fmt(perfTotals.netIncome, 0)} ر.س
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </CardContent>
  </Card>
);

export default PropertyPerformanceTable;
