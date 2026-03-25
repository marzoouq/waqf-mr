/**
 * D-5: جدول الإجراءات المعلقة — سُلف معلقة + فواتير ZATCA غير مُرسلة
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import { safeNumber } from '@/utils/safeNumber';
import { fmt } from '@/utils/format';

interface PendingAction {
  type: 'advance' | 'zatca';
  label: string;
  detail: string;
  amount?: number;
  link: string;
}

interface PendingActionsTableProps {
  advanceRequests: Array<{ id: string; status: string; amount: number; reason?: string | null }>;
  paymentInvoices: Array<{ id: string; zatca_status?: string | null; invoice_number: string; amount: number }>;
}

const PendingActionsTable = ({ advanceRequests, paymentInvoices }: PendingActionsTableProps) => {
  // BUG-M2 fix: حساب العدد الكلي للفواتير غير المُرسلة قبل القطع
  const unsubmittedZatcaTotal = useMemo(() => {
    return paymentInvoices.filter(
      inv => inv.zatca_status === 'not_submitted' || !inv.zatca_status
    ).length;
  }, [paymentInvoices]);

  const zatcaOverflow = Math.max(0, unsubmittedZatcaTotal - 10);

  const actions = useMemo<PendingAction[]>(() => {
    const items: PendingAction[] = [];

    // سُلف معلقة
    advanceRequests
      .filter(r => r.status === 'pending')
      .forEach(r => {
        items.push({
          type: 'advance',
          label: 'طلب سُلفة معلق',
          detail: r.reason || '—',
          amount: safeNumber(r.amount),
          link: '/dashboard/accounts',
        });
      });

    // فواتير ZATCA غير مُرسلة (أول 10 فقط)
    paymentInvoices
      .filter(inv => inv.zatca_status === 'not_submitted' || !inv.zatca_status)
      .slice(0, 10)
      .forEach(inv => {
        items.push({
          type: 'zatca',
          label: 'فاتورة غير مُرسلة لـ ZATCA',
          detail: inv.invoice_number,
          amount: safeNumber(inv.amount),
          link: '/dashboard/zatca',
        });
      });

    return items;
  }, [advanceRequests, paymentInvoices]);

  // العدد الحقيقي يشمل المعروضة + المخفية
  const totalActionsCount = actions.length + zatcaOverflow;

  if (actions.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-5 h-5 text-warning" />
          الإجراءات المعلقة
          <Badge variant="secondary">{totalActionsCount}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Mobile Cards */}
        <div className="space-y-2 p-3 md:hidden">
          {actions.map((action, i) => (
            <div key={`${action.type}-${i}`} className="flex items-center justify-between gap-2 border rounded-lg p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <Badge variant={action.type === 'advance' ? 'default' : 'outline'} className="text-xs">
                  {action.label}
                </Badge>
                <p className="text-xs text-muted-foreground truncate">{action.detail}</p>
                {action.amount ? (
                  <p className="text-sm font-medium tabular-nums">{fmt(action.amount)} ر.س</p>
                ) : null}
              </div>
              <Link to={action.link}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          ))}
          {zatcaOverflow > 0 && (
            <Link to="/dashboard/zatca" className="block text-center">
              <Button variant="link" size="sm" className="text-xs text-muted-foreground">
                + {zatcaOverflow} فاتورة أخرى غير مُرسلة لـ ZATCA
              </Button>
            </Link>
          )}
        </div>
        {/* Desktop Table */}
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">التفاصيل</TableHead>
                <TableHead className="text-right">المبلغ</TableHead>
                <TableHead className="text-center w-[80px]">إجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.map((action, i) => (
                <TableRow key={`${action.type}-${i}`}>
                  <TableCell>
                    <Badge variant={action.type === 'advance' ? 'default' : 'outline'} className="text-xs">
                      {action.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {action.detail}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {action.amount ? `${fmt(action.amount)} ر.س` : '—'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link to={action.link}>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {zatcaOverflow > 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-2">
                    <Link to="/dashboard/zatca">
                      <Button variant="link" size="sm" className="text-xs text-muted-foreground">
                        + {zatcaOverflow} فاتورة أخرى غير مُرسلة لـ ZATCA
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingActionsTable;
