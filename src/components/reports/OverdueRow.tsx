/**
 * صف واحد لمستأجر متأخر — مُستخرَج من OverdueTenantsReport
 */
import { TableCell, TableRow } from '@/components/ui/table';
import { fmt, fmtDate } from '@/utils/format/format';
import SeverityBadge from './SeverityBadge';
import type { OverdueRowData } from './overdueTypes';

// إعادة تصدير للحفاظ على التوافق العكسي
export type { OverdueRowData } from './overdueTypes';

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
      <TableCell><SeverityBadge severity={row.severity} /></TableCell>
    </TableRow>
  );
}
