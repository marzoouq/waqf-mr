import { Card, CardContent } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import AdvanceRequestDialog from '@/components/beneficiaries/AdvanceRequestDialog';

interface BeneficiaryAdvanceCardProps {
  beneficiaryId: string;
  fiscalYearId: string;
  myShare: number;
  isClosed: boolean;
  pendingAdvanceCount: number;
  minAmount: number;
  maxPercentage: number;
}

const BeneficiaryAdvanceCard = ({
  beneficiaryId,
  fiscalYearId,
  myShare,
  isClosed,
  pendingAdvanceCount,
  minAmount,
  maxPercentage,
}: BeneficiaryAdvanceCardProps) => {
  return (
    <Card className="shadow-sm border-accent/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <p className="font-bold text-sm">طلب سلفة</p>
              <p className="text-xs text-muted-foreground">
                {pendingAdvanceCount > 0
                  ? `لديك ${pendingAdvanceCount} طلب قيد المراجعة`
                  : 'يمكنك طلب سلفة من حصتك المستقبلية'}
              </p>
            </div>
          </div>
          <AdvanceRequestDialog
            beneficiaryId={beneficiaryId}
            fiscalYearId={fiscalYearId}
            estimatedShare={myShare}
            paidAdvances={0}
            isFiscalYearActive={!isClosed}
            minAmount={minAmount}
            maxPercentage={maxPercentage}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryAdvanceCard;
