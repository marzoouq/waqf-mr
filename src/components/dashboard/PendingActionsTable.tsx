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
  const actions = useMemo<PendingAction[]>(() => {
    const items: PendingAction[] = [];

    // سُلف معلقة
    advanceRequests
      .filter(r => r.status === 'pending')
      .forEach(r => {
        items.push({
          type: 'advance',
          label: 'طلب سُلفة معلق',
          detail: r.reason || 'بدون سبب',
          amount: safeNumber(r.amount),
          link: '/dashboard/beneficiaries',
        });
      });

    // فواتير ZATCA غير مُرسلة
    paymentInvoices
      .filter(inv => inv.zatca_status === 'not_submitted' || !inv.zatca_status)
      .slice(0, 10) // حد أقصى 10 لتجنب تضخم الجدول
      .forEach(inv => {
        items.push({
          type: 'zatca',
          label: 'فاتورة غير مُرسلة لـ ZATCA',
          detail: inv.invoice_number,
          amount: Number(inv.amount),
          link: '/dashboard/contracts',
        });
      });

    return items;
  }, [advanceRequests, paymentInvoices]);

  if (actions.length === 0) return null;

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-5 h-5 text-warning" />
          الإجراءات المعلقة
          <Badge variant="secondary">{actions.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
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
                <TableRow key={i}>
                  <TableCell>
                    <Badge variant={action.type === 'advance' ? 'default' : 'outline'} className="text-xs">
                      {action.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate max-w-[200px]">
                    {action.detail}
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">
                    {action.amount ? `${action.amount.toLocaleString('ar-SA')} ر.س` : '—'}
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
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingActionsTable;
