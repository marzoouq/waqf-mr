import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';
import { fmt as fmtNum } from '@/utils/format/format';
import { AssetsSection, LiabilitiesSection, EquitySection, BalanceSummary } from './balance-sheet/BalanceSheetSections';

interface BalanceSheetProps {
  totalIncome: number;
  totalExpenses: number;
  vatAmount: number;
  zakatAmount: number;
  adminShare: number;
  waqifShare: number;
  waqfRevenue: number;
  waqfCorpusPrevious: number;
  waqfCorpusManual: number;
  distributionsAmount: number;
  availableAmount: number;
  grandTotal: number;
  netAfterExpenses: number;
  netAfterVat: number;
  netAfterZakat: number;
  fiscalYearLabel?: string;
}

/** R-2: تقرير الميزانية العمومية — عرض الأصول والالتزامات وحقوق الملكية */
const BalanceSheetReport = ({
  totalIncome, totalExpenses, vatAmount, zakatAmount,
  adminShare, waqifShare, waqfRevenue,
  waqfCorpusPrevious, waqfCorpusManual,
  distributionsAmount, availableAmount,
  grandTotal, netAfterExpenses, netAfterVat, netAfterZakat,
  fiscalYearLabel,
}: BalanceSheetProps) => {
  const totalAssets = grandTotal;
  const totalLiabilities = totalExpenses + vatAmount + zakatAmount;
  const totalEquity = adminShare + waqifShare + waqfRevenue;
  const balanceCheck = totalAssets - totalLiabilities - totalEquity;
  const isBalanced = Math.abs(balanceCheck) < 1;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5" />
          الميزانية العمومية {fiscalYearLabel && `(${fiscalYearLabel})`}
          {isBalanced ? (
            <Badge variant="secondary" className="bg-success/10 text-success text-xs ms-auto">متوازنة ✓</Badge>
          ) : (
            <Badge variant="destructive" className="text-xs ms-auto">فرق: {fmtNum(balanceCheck)} ر.س</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AssetsSection waqfCorpusPrevious={waqfCorpusPrevious} totalIncome={totalIncome} totalAssets={totalAssets} />
        <LiabilitiesSection totalExpenses={totalExpenses} vatAmount={vatAmount} zakatAmount={zakatAmount} totalLiabilities={totalLiabilities} />
        <EquitySection
          adminShare={adminShare} waqifShare={waqifShare} waqfRevenue={waqfRevenue}
          waqfCorpusManual={waqfCorpusManual} distributionsAmount={distributionsAmount}
          availableAmount={availableAmount} totalEquity={totalEquity}
        />
        <BalanceSummary
          netAfterExpenses={netAfterExpenses} netAfterVat={netAfterVat}
          netAfterZakat={netAfterZakat} availableAmount={availableAmount}
        />
      </CardContent>
    </Card>
  );
};

export default BalanceSheetReport;
