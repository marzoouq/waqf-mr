/**
 * صف واحد لجدول التحصيل (سطح المكتب) — Batch E memoization
 */
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TableRow, TableCell } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, CheckCircle2, Clock, CalendarRange } from 'lucide-react';
import { fmt } from '@/utils/format/format';
import type { CollectionRow } from '@/hooks/page/admin/financial/useCollectionData';

function getStatusBadge(status: CollectionRow['status']) {
  switch (status) {
    case 'complete': return <Badge className="bg-success/20 text-success border-0 gap-1"><CheckCircle2 className="w-3 h-3" />مكتمل</Badge>;
    case 'overdue': return <Badge className="bg-destructive/20 text-destructive border-0 gap-1"><AlertTriangle className="w-3 h-3" />متأخر</Badge>;
    case 'partial': return <Badge className="bg-warning/20 text-warning border-0 gap-1"><Clock className="w-3 h-3" />جزئي</Badge>;
    default: return <Badge className="bg-muted text-muted-foreground border-0">لم يبدأ</Badge>;
  }
}

interface Props { row: CollectionRow }

const CollectionTableRow = memo(function CollectionTableRow({ row }: Props) {
  return (
    <TableRow className={row.overdue > 0 ? 'bg-destructive/5' : ''}>
      <TableCell className="font-medium">
        {row.contract.contract_number}
        {row.contract.status === 'expired' && (
          <Badge variant="outline" className="text-destructive border-destructive/30 text-[11px] ms-2">منتهي</Badge>
        )}
      </TableCell>
      <TableCell>{row.contract.tenant_name}</TableCell>
      <TableCell>{row.contract.property?.property_number || '-'}</TableCell>
      <TableCell>{fmt(row.totalAmount)} ر.س</TableCell>
      <TableCell>{fmt(row.paymentAmount)} ر.س</TableCell>
      <TableCell className="text-center">
        <span className={`font-bold ${row.overdue > 0 ? 'text-destructive' : 'text-foreground'}`}>
          {row.paid}/{row.paymentCount}
          {row.spansMultipleYears && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 ms-1 cursor-help">
                    <CalendarRange className="w-3 h-3 text-warning inline" />
                    <span className="text-muted-foreground text-[11px]">/{row.totalContractPayments}</span>
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-right">
                  <p className="font-bold mb-1">عقد ممتد على أكثر من سنة</p>
                  <p>المخصص لهذه السنة: {row.paymentCount} دفعات</p>
                  <p>إجمالي العقد: {row.totalContractPayments} دفعة</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </span>
        {row.overdue > 0 && (
          <span className="text-xs text-destructive block">({row.overdue} متأخرة)</span>
        )}
      </TableCell>
      <TableCell className="text-success font-medium">{fmt(row.collectedAmount)} ر.س</TableCell>
      <TableCell className={`font-medium ${row.overdue > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
        {row.overdueAmount > 0 ? `${fmt(row.overdueAmount)} ر.س` : '-'}
      </TableCell>
      <TableCell>
        <Progress
          value={row.paymentCount > 0 ? (row.paid / row.paymentCount) * 100 : 0}
          className={`h-2 w-20 mx-auto ${row.status === 'complete' ? '[&>div]:bg-success' : row.overdue > 0 ? '[&>div]:bg-destructive' : '[&>div]:bg-warning'}`}
        />
      </TableCell>
      <TableCell className="text-center">{getStatusBadge(row.status)}</TableCell>
    </TableRow>
  );
});

export default CollectionTableRow;
