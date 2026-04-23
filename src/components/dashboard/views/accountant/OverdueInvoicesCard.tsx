/**
 * OverdueInvoicesCard — بطاقة الفواتير المتأخرة
 * مستخرجة من AccountantDashboardView (موجة 17).
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtInt } from '@/utils/format/format';
import type { AccountantMetrics } from '@/hooks/page/admin/dashboard/useAccountantDashboardData';

interface OverdueInvoicesCardProps {
  invoices: AccountantMetrics['overdueInvoices'];
  total: number;
}

const OverdueInvoicesCard = memo(function OverdueInvoicesCard({
  invoices, total,
}: OverdueInvoicesCardProps) {
  if (!invoices.length) {
    return (
      <Card className="shadow-sm border-success/30">
        <CardContent className="py-6 text-center">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-success" />
          <p className="text-sm text-muted-foreground">لا توجد فواتير متأخرة — ممتاز!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          فواتير متأخرة ({invoices.length})
          <Badge variant="destructive" className="mr-auto">{fmtInt(total)} ر.س</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[280px] overflow-y-auto">
          {invoices.slice(0, 10).map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-destructive shrink-0" />
                  <span className="font-medium text-sm truncate">{inv.invoiceNumber}</span>
                  <Badge variant="outline" className="text-xs border-destructive/30 text-destructive shrink-0">
                    متأخر {inv.daysOverdue} يوم
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  {inv.tenantName} — عقار {inv.propertyNumber}
                </p>
              </div>
              <span className="font-bold text-sm text-destructive shrink-0 mr-2">
                {fmtInt(inv.amount)} ر.س
              </span>
            </div>
          ))}
        </div>
        {invoices.length > 10 && (
          <Link to="/dashboard/contracts" className="block mt-3">
            <Button variant="outline" size="sm" className="w-full">
              عرض جميع الفواتير المتأخرة ({invoices.length})
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
});

export default OverdueInvoicesCard;
