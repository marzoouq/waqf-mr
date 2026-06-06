import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import DisclosureIncomeBlock from './DisclosureIncomeBlock';
import DisclosureExpensesBlock from './DisclosureExpensesBlock';
import DisclosureWaterfallBlock from './DisclosureWaterfallBlock';
import DisclosureMyShareCard from './DisclosureMyShareCard';

interface Props {
  incomeBySource: Record<string, number>;
  expensesByType: Record<string, number>;
  totalIncome: number;
  totalExpenses: number;
  waqfCorpusPrevious: number;
  grandTotal: number;
  netAfterExpenses: number;
  vatAmount: number;
  netAfterVat: number;
  zakatAmount: number;
  netAfterZakat: number;
  adminShare: number;
  waqifShare: number;
  adminPct: number;
  waqifPct: number;
  waqfCorpusManual: number;
  beneficiariesShare: number;
  myShare: number;
  totalReceived: number;
  pendingAmount: number;
  currentBeneficiaryName: string;
  currentBeneficiaryPct: number;
}

const DisclosureFinancialStatement = (props: Props) => (
  <Card className="shadow-sm">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <FileText className="w-5 h-5" />
        البيان المالي التفصيلي
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        <DisclosureIncomeBlock
          incomeBySource={props.incomeBySource}
          totalIncome={props.totalIncome}
        />
        <DisclosureExpensesBlock
          expensesByType={props.expensesByType}
          totalExpenses={props.totalExpenses}
          vatAmount={props.vatAmount}
        />
        <DisclosureWaterfallBlock
          waqfCorpusPrevious={props.waqfCorpusPrevious}
          grandTotal={props.grandTotal}
          netAfterExpenses={props.netAfterExpenses}
          vatAmount={props.vatAmount}
          netAfterVat={props.netAfterVat}
          zakatAmount={props.zakatAmount}
          netAfterZakat={props.netAfterZakat}
          adminShare={props.adminShare}
          adminPct={props.adminPct}
          waqifShare={props.waqifShare}
          waqifPct={props.waqifPct}
          waqfCorpusManual={props.waqfCorpusManual}
          beneficiariesShare={props.beneficiariesShare}
        />
        <DisclosureMyShareCard
          myShare={props.myShare}
          totalReceived={props.totalReceived}
          pendingAmount={props.pendingAmount}
          currentBeneficiaryName={props.currentBeneficiaryName}
          currentBeneficiaryPct={props.currentBeneficiaryPct}
        />
      </div>
    </CardContent>
  </Card>
);

export default DisclosureFinancialStatement;
