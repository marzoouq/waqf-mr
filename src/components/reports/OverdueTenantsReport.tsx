import { useMemo } from 'react';
import { safeNumber } from '@/utils/format/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead } from '@/components/ui/table';
import { AlertTriangle, Clock } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import { usePaymentInvoices } from '@/hooks/data/invoices/usePaymentInvoices';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import OverdueRow, { type OverdueRowData } from './OverdueRow';
import OverdueMobileCard from './OverdueMobileCard';

interface OverdueTenantsReportProps {
  contracts: Array<{
    id: string;
    contract_number: string;
    tenant_name: string;
    rent_amount: number;
    property_id: string;
    status: string;
  }>;
  properties: Array<{ id: string; property_number: string }>;
}

/**
 * R-8: تقرير تفصيلي للمستأجرين المتأخرين عن السداد
 * يجلب الفواتير ذاتياً عند عرض المكون (lazy loading)
 */
const OverdueTenantsReport = ({ contracts, properties }: OverdueTenantsReportProps) => {
  const { fiscalYearId } = useFiscalYear();
  const { data: paymentInvoices = [], isLoading: invoicesLoading } = usePaymentInvoices(fiscalYearId ?? 'all');

  const overdueData: OverdueRowData[] = useMemo(() => {
    const now = Date.now();
    const propertyMap = new Map(properties.map(p => [p.id, p.property_number]));
    const contractOverdue = new Map<string, { count: number; totalAmount: number; oldestDue: string; maxDays: number }>();

    for (const inv of paymentInvoices) {
      if (inv.status !== 'paid') {
        const dueDate = new Date(inv.due_date);
        const daysPast = Math.floor((now - dueDate.getTime()) / (1000 * 3600 * 24));
        if (daysPast > 0) {
          const existing = contractOverdue.get(inv.contract_id);
          if (existing) {
            existing.count++;
            existing.totalAmount += safeNumber(inv.amount);
            if (inv.due_date < existing.oldestDue) existing.oldestDue = inv.due_date;
            if (daysPast > existing.maxDays) existing.maxDays = daysPast;
          } else {
            contractOverdue.set(inv.contract_id, {
              count: 1,
              totalAmount: safeNumber(inv.amount),
              oldestDue: inv.due_date,
              maxDays: daysPast,
            });
          }
        }
      }
    }

    return contracts
      .filter(c => contractOverdue.has(c.id))
      .map(c => {
        const overdue = contractOverdue.get(c.id)!;
        return {
          contractNumber: c.contract_number,
          tenantName: c.tenant_name,
          propertyNumber: propertyMap.get(c.property_id) || '-',
          overdueCount: overdue.count,
          totalOverdue: overdue.totalAmount,
          maxDays: overdue.maxDays,
          oldestDue: overdue.oldestDue,
          severity: overdue.maxDays > 90 ? 'critical' : overdue.maxDays > 60 ? 'high' : overdue.maxDays > 30 ? 'medium' : 'low',
        };
      })
      .sort((a, b) => b.maxDays - a.maxDays);
  }, [contracts, paymentInvoices, properties]);

  const totalOverdueAmount = overdueData.reduce((s, r) => s + r.totalOverdue, 0);

  if (invoicesLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">جاري تحميل بيانات الفواتير...</p>
        </CardContent>
      </Card>
    );
  }

  if (overdueData.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">لا يوجد مستأجرين متأخرين عن السداد</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            المستأجرون المتأخرون ({overdueData.length})
          </span>
          <span className="text-sm font-bold text-destructive">
            إجمالي المتأخرات: {fmt(totalOverdueAmount)} ر.س
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* عرض بطاقات الجوال */}
        <div className="md:hidden space-y-3">
          {overdueData.map((row) => (
            <OverdueMobileCard key={row.contractNumber} row={row} />
          ))}
        </div>

        {/* عرض الجدول للشاشات الكبيرة */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>المستأجر</TableHead>
                <TableHead>رقم العقد</TableHead>
                <TableHead>العقار</TableHead>
                <TableHead>فواتير متأخرة</TableHead>
                <TableHead>إجمالي المتأخر</TableHead>
                <TableHead>أقدم استحقاق</TableHead>
                <TableHead>الأيام</TableHead>
                <TableHead>الخطورة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueData.map((row) => (
                <OverdueRow key={row.contractNumber} row={row} />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverdueTenantsReport;
