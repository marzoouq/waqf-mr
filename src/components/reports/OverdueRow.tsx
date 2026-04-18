/**
 * صف واحد لمستأجر متأخر — مُستخرَج من OverdueTenantsReport
 */
import { Badge } from '@/components/ui/badge';
import { TableCell, TableRow } from '@/components/ui/table';
import { fmt, fmtDate } from '@/utils/format/format';

export interface OverdueRowData {
  contractNumber: string;
  tenantName: string;
  propertyNumber: string;
  overdueCount: number;
  totalOverdue: number;
  maxDays: number;
  oldestDue: string;
  severity: string;
}

const getSeverityBadge = (severity: string) => {
  switch (severity) {
    case 'critical': return <Badge variant="destructive">حرج (&gt;90 يوم)</Badge>;
    case 'high': return <Badge className="bg-destructive/60 text-destructive-foreground">عالي (&gt;60 يوم)</Badge>;
    case 'medium': return <Badge className="bg-warning/20 text-warning">متوسط (&gt;30 يوم)</Badge>;
    default: return <Badge variant="outline">منخفض</Badge>;
  }
};

interface Props {
  row: OverdueRowData;
}

export default function OverdueRow({ row }: Props) {
  return (
    <TableRow>
      <TableCell className="font-medium">{row.tenantName}</TableCell>
      <TableCell dir="ltr" className="text-sm">{row.contractNumber}</TableCell>
      <TableCell>{row.propertyNumber}</TableCell>
      <TableCell className="text-center">{row.overdueCount}</TableCell>
      <TableCell className="text-destructive font-medium">
        {fmt(row.totalOverdue)} ر.س
      </TableCell>
      <TableCell>{fmtDate(row.oldestDue)}</TableCell>
      <TableCell className="font-bold">{row.maxDays}</TableCell>
      <TableCell>{getSeverityBadge(row.severity)}</TableCell>
    </TableRow>
  );
}

export { getSeverityBadge };
