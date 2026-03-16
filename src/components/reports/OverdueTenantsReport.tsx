import { useMemo } from 'react';
import { safeNumber } from '@/utils/safeNumber';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock } from 'lucide-react';

interface OverdueTenantsReportProps {
  contracts: Array<{
    id: string;
    contract_number: string;
    tenant_name: string;
    rent_amount: number;
    property_id: string;
    status: string;
  }>;
  paymentInvoices: Array<{
    id: string;
    contract_id: string;
    due_date: string;
    amount: number;
    status: string;
    payment_number: number;
  }>;
  properties: Array<{ id: string; property_number: string }>;
}

/**
 * R-8: تقرير تفصيلي للمستأجرين المتأخرين عن السداد
 */
const OverdueTenantsReport = ({ contracts, paymentInvoices, properties }: OverdueTenantsReportProps) => {
  const overdueData = useMemo(() => {
    const now = Date.now();
    const propertyMap = new Map(properties.map(p => [p.id, p.property_number]));

    // تجميع الفواتير المتأخرة حسب العقد
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
              totalAmount: Number(inv.amount),
              oldestDue: inv.due_date,
              maxDays: daysPast,
            });
          }
        }
      }
    }

    // بناء الجدول
    const rows = contracts
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

    return rows;
  }, [contracts, paymentInvoices, properties]);

  const totalOverdueAmount = overdueData.reduce((s, r) => s + r.totalOverdue, 0);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive">حرج (&gt;90 يوم)</Badge>;
      case 'high': return <Badge className="bg-destructive/60 text-destructive-foreground">عالي (&gt;60 يوم)</Badge>;
      case 'medium': return <Badge className="bg-warning/20 text-warning">متوسط (&gt;30 يوم)</Badge>;
      default: return <Badge variant="outline">منخفض</Badge>;
    }
  };

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
            إجمالي المتأخرات: {totalOverdueAmount.toLocaleString('ar-SA')} ر.س
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                <TableRow key={row.contractNumber}>
                  <TableCell className="font-medium">{row.tenantName}</TableCell>
                  <TableCell dir="ltr" className="text-sm">{row.contractNumber}</TableCell>
                  <TableCell>{row.propertyNumber}</TableCell>
                  <TableCell className="text-center">{row.overdueCount}</TableCell>
                  <TableCell className="text-destructive font-medium">
                    {row.totalOverdue.toLocaleString('ar-SA')} ر.س
                  </TableCell>
                  <TableCell>{new Date(row.oldestDue).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell className="font-bold">{row.maxDays}</TableCell>
                  <TableCell>{getSeverityBadge(row.severity)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default OverdueTenantsReport;
