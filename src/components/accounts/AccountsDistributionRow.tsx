/**
 * صف واحد في جدول التوزيع المحاسبي — مُستخرَج من AccountsDistributionTable
 * مُغلَّف بـ memo لتقليل re-renders عند تحديث الجدول.
 */
import { memo } from 'react';
import { TableCell, TableRow } from '@/components/ui/table';
import { fmt } from '@/utils/format/format';

export interface DistRow {
  label: string;
  pct?: string;
  amount: number;
  amountClass?: string;
  rowClass?: string;
  bold?: boolean;
}

interface Props { row: DistRow }

const AccountsDistributionRow = memo(function AccountsDistributionRow({ row }: Props) {
  return (
    <TableRow className={row.rowClass}>
      <TableCell className={row.bold ? 'font-bold' : 'font-medium'}>{row.label}</TableCell>
      <TableCell>{row.pct ?? '-'}</TableCell>
      <TableCell className={`${row.bold ? 'font-bold' : ''} ${row.amountClass ?? ''}`}>{fmt(row.amount)}</TableCell>
    </TableRow>
  );
});

export default AccountsDistributionRow;
