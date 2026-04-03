/**
 * C-1: جدول الاستحقاقات الشهري — يعتمد على فواتير الدفعات كمصدر وحيد للحقيقة
 * يعرض المبلغ الفعلي لكل فاتورة في شهر استحقاقها (بدلاً من rent/12)
 */
import { useMemo } from 'react';
import { Contract } from '@/types/database';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import {
  type CellData, type CellStatus,
  buildFiscalMonthGrid, getCellClasses, fmtNum,
  MobileAccrualCard,
} from './accrual/AccrualHelpers';
import { isFySpecific } from '@/constants/fiscalYearIds';

/** واجهة فاتورة الدفعة المُمررة من الخارج */
interface InvoiceInfo {
  id: string;
  contract_id: string;
  due_date: string;
  amount: number;
  status: string;
}

interface MonthlyAccrualTableProps {
  contracts: Contract[];
  paymentInvoices?: InvoiceInfo[];
  isLoading?: boolean;
  fiscalYearId?: string;
  fiscalYear?: { start_date: string; end_date: string; label?: string } | null;
}

const MonthlyAccrualTable = ({ contracts, paymentInvoices = [], isLoading, fiscalYearId, fiscalYear }: MonthlyAccrualTableProps) => {
  const isSpecificYear = isFySpecific(fiscalYearId);

  const activeContracts = useMemo(
    () => isSpecificYear ? contracts : contracts.filter(c => c.status === 'active'),
    [contracts, isSpecificYear]
  );

  const monthGrid = useMemo(() => buildFiscalMonthGrid(fiscalYear), [fiscalYear]);

  const tableTitle = useMemo(() => {
    if (fiscalYear && 'label' in fiscalYear && fiscalYear.label) return fiscalYear.label;
    if (fiscalYear?.start_date) {
      const sy = new Date(fiscalYear.start_date).getFullYear();
      const ey = new Date(fiscalYear.end_date).getFullYear();
      return sy === ey ? String(sy) : `${sy}-${ey}`;
    }
    return String(new Date().getFullYear());
  }, [fiscalYear]);

  /** بناء خريطة: contract_id → فواتير مجمعة حسب (شهر, سنة) */
  const invoiceMap = useMemo(() => {
    const map = new Map<string, Map<string, { amount: number; status: CellStatus }>>();
    for (const inv of paymentInvoices) {
      const d = new Date(inv.due_date);
      const key = `${d.getMonth()}-${d.getFullYear()}`;
      if (!map.has(inv.contract_id)) map.set(inv.contract_id, new Map());
      const contractMap = map.get(inv.contract_id)!;
      const existing = contractMap.get(key);
      const invStatus: CellStatus = inv.status === 'paid' ? 'paid' : inv.status === 'overdue' ? 'overdue' : 'pending';
      if (existing) {
        existing.amount += inv.amount;
        if (invStatus === 'overdue') existing.status = 'overdue';
        else if (invStatus === 'pending' && existing.status !== 'overdue') existing.status = 'pending';
      } else {
        contractMap.set(key, { amount: inv.amount, status: invStatus });
      }
    }
    return map;
  }, [paymentInvoices]);

  const accrualData = useMemo(() => {
    return activeContracts.map(contract => {
      const contractInvoices = invoiceMap.get(contract.id);
      const cells: CellData[] = monthGrid.map(cell => {
        const key = `${cell.month}-${cell.year}`;
        const data = contractInvoices?.get(key);
        return data ? { amount: data.amount, status: data.status } : { amount: 0, status: 'empty' as CellStatus };
      });
      const total = cells.reduce((s, c) => s + c.amount, 0);
      return { contract, cells, total };
    });
  }, [activeContracts, monthGrid, invoiceMap]);

  const monthlyTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    accrualData.forEach(row => {
      row.cells.forEach((c, i) => { totals[i] += c.amount; });
    });
    return totals;
  }, [accrualData]);

  const grandTotal = monthlyTotals.reduce((s, v) => s + v, 0);

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted rounded" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activeContracts.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center">
          <CalendarDays className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا توجد عقود لعرض الاستحقاقات</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="w-5 h-5 text-primary" />
          جدول الاستحقاقات — {tableTitle}
          <Badge variant="secondary" className="mr-2">{activeContracts.length} عقد</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 md:p-0">
        {/* عرض بطاقات الجوال */}
        <div className="md:hidden p-3 space-y-3">
          <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
            <p className="text-xs text-muted-foreground">الإجمالي السنوي</p>
            <p className="text-lg font-bold text-primary tabular-nums">{fmtNum(grandTotal)} ر.س</p>
          </div>
          {accrualData.map(({ contract, cells, total }) => (
            <MobileAccrualCard key={contract.id} contract={contract} cells={cells} total={total} grid={monthGrid} />
          ))}
        </div>

        {/* عرض الجدول للشاشات الكبيرة */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="min-w-[1200px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right sticky right-0 bg-muted/50 z-10 min-w-[160px]">العقد / المستأجر</TableHead>
                {monthGrid.map((cell, i) => (
                  <TableHead key={i} className="text-center text-xs min-w-[85px]">{cell.label}</TableHead>
                ))}
                <TableHead className="text-center font-bold min-w-[100px]">الإجمالي</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accrualData.map(({ contract, cells, total }) => (
                <TableRow key={contract.id}>
                  <TableCell className="sticky right-0 bg-background z-10">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{contract.contract_number}</p>
                      <p className="text-xs text-muted-foreground truncate">{contract.tenant_name}</p>
                    </div>
                  </TableCell>
                  {cells.map((cell, i) => (
                    <TableCell key={i} className={`text-center text-xs tabular-nums ${getCellClasses(cell.status)}`}>
                      {cell.amount > 0 ? fmtNum(cell.amount) : '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-center font-bold text-sm tabular-nums">
                    {fmtNum(total)}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                <TableCell className="sticky right-0 bg-primary/5 z-10 text-primary">الإجمالي</TableCell>
                {monthlyTotals.map((total, i) => (
                  <TableCell key={i} className="text-center text-xs tabular-nums text-primary">
                    {total > 0 ? fmtNum(total) : '—'}
                  </TableCell>
                ))}
                <TableCell className="text-center text-primary text-sm tabular-nums">
                  {fmtNum(grandTotal)} ر.س
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default MonthlyAccrualTable;
