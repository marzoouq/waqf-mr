import { memo } from 'react';
import type { Contract } from '@/types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { type CellData, getCellClasses, fmtNum } from './accrualUtils';

interface AccrualRow {
  contract: Contract;
  cells: CellData[];
  total: number;
}

interface Props {
  rows: AccrualRow[];
  monthGrid: { label: string; month: number; year: number }[];
  monthlyTotals: number[];
  grandTotal: number;
}

const AccrualDesktopTable = ({ rows, monthGrid, monthlyTotals, grandTotal }: Props) => (
  <div className="hidden md:block overflow-x-auto">
    <Table className="min-w-[1200px]">
      <TableHeader>
        <TableRow className="bg-muted/50">
          <TableHead className="text-right sticky right-0 bg-muted/50 z-10 min-w-[160px]">العقد / المستأجر</TableHead>
          {monthGrid.map((cell) => (
            <TableHead key={cell.label} className="text-center text-xs min-w-[85px]">{cell.label}</TableHead>
          ))}
          <TableHead className="text-center font-bold min-w-[100px]">الإجمالي</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ contract, cells, total }) => (
          <TableRow key={contract.id}>
            <TableCell className="sticky right-0 bg-background z-10">
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{contract.contract_number}</p>
                <p className="text-xs text-muted-foreground truncate">{contract.tenant_name}</p>
              </div>
            </TableCell>
            {cells.map((cell, i) => (
              <TableCell key={`${contract.id}-${monthGrid[i]?.label ?? i}`} className={`text-center text-xs tabular-nums ${getCellClasses(cell.status)}`}>
                {cell.amount > 0 ? fmtNum(cell.amount) : '—'}
              </TableCell>
            ))}
            <TableCell className="text-center font-bold text-sm tabular-nums">
              {fmtNum(total)}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
          <TableCell className="sticky right-0 bg-primary/5 z-10 text-primary">الإجمالي</TableCell>
          {monthlyTotals.map((total, i) => (
            <TableCell key={`total-${monthGrid[i]?.label ?? i}`} className="text-center text-xs tabular-nums text-primary">
              {total > 0 ? fmtNum(total) : '—'}
            </TableCell>
          ))}
          <TableCell className="text-center text-primary text-sm tabular-nums">
            {fmtNum(grandTotal)} ر.س
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
);

export default memo(AccrualDesktopTable);
