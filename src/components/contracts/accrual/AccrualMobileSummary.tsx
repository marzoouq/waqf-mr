import { memo } from 'react';
import type { Contract } from '@/types';
import { type CellData, fmtNum } from './accrualUtils';
import { MobileAccrualCard } from './AccrualHelpers';

interface AccrualRow {
  contract: Contract;
  cells: CellData[];
  total: number;
}

interface Props {
  rows: AccrualRow[];
  monthGrid: { label: string; month: number; year: number }[];
  grandTotal: number;
}

const AccrualMobileSummary = ({ rows, monthGrid, grandTotal }: Props) => (
  <div className="md:hidden p-3 space-y-3">
    <div className="bg-primary/5 rounded-lg p-3 text-center border border-primary/20">
      <p className="text-xs text-muted-foreground">الإجمالي السنوي</p>
      <p className="text-lg font-bold text-primary tabular-nums">{fmtNum(grandTotal)} ر.س</p>
    </div>
    {rows.map(({ contract, cells, total }) => (
      <MobileAccrualCard key={contract.id} contract={contract} cells={cells} total={total} grid={monthGrid} />
    ))}
  </div>
);

export default memo(AccrualMobileSummary);
