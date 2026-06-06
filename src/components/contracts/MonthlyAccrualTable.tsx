/**
 * C-1: جدول الاستحقاقات الشهري — يعتمد على فواتير الدفعات كمصدر وحيد للحقيقة
 * يعرض المبلغ الفعلي لكل فاتورة في شهر استحقاقها (بدلاً من rent/12)
 */
import { useMemo, memo } from 'react';
import { Contract } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import {
  type CellData, type CellStatus,
  buildFiscalMonthGrid,
} from './accrual/accrualUtils';
import AccrualDesktopTable from './accrual/AccrualDesktopTable';
import AccrualMobileSummary from './accrual/AccrualMobileSummary';
import { isFySpecific } from '@/constants/fiscalYearIds';

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
        <AccrualMobileSummary rows={accrualData} monthGrid={monthGrid} grandTotal={grandTotal} />
        <AccrualDesktopTable rows={accrualData} monthGrid={monthGrid} monthlyTotals={monthlyTotals} grandTotal={grandTotal} />
      </CardContent>
    </Card>
  );
};

export default memo(MonthlyAccrualTable);
