/** ملخص الإجماليات على الجوال */
import { Card, CardContent } from '@/components/ui/card';
import { getTenantFromContracts, getMonthlyRent, getMonthlyFromContract } from './helpers';
import { safeNumber } from '@/utils/safeNumber';
import { fmt, fmtInt } from '@/utils/format';
import type { UnitRow } from '@/hooks/useUnits';
import type { Contract } from '@/types/database';

interface MobileSummaryCardProps {
  units: UnitRow[];
  contracts: Contract[];
  wholePropertyContracts: Contract[];
}

const MobileSummaryCard = ({ units, contracts, wholePropertyContracts }: MobileSummaryCardProps) => {
  let totalAnnual = 0;
  let totalMonthly = 0;
  units.forEach(u => {
    const t = getTenantFromContracts(u.id, contracts);
    if (t) {
      totalAnnual += safeNumber(t.rent_amount);
      totalMonthly += getMonthlyRent(t);
    }
  });
  wholePropertyContracts.forEach(wc => {
    totalAnnual += safeNumber(wc.rent_amount);
    totalMonthly += getMonthlyFromContract(wc);
  });

  if (totalAnnual === 0) return null;

  return (
    <Card className="md:hidden bg-primary/10 border-primary/20">
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="text-center flex-1">
            <p className="text-[11px] text-muted-foreground">إجمالي الشهري</p>
            <p className="text-sm font-bold">{fmtInt(totalMonthly)} ريال</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex-1">
            <p className="text-[11px] text-muted-foreground">إجمالي السنوي</p>
            <p className="text-sm font-bold">{fmt(totalAnnual)} ريال</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MobileSummaryCard;
