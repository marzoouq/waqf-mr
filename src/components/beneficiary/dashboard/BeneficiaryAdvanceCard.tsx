import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Banknote } from 'lucide-react';
import { ADVANCE_CARD_COPY } from '@/constants/beneficiaryCopy';
import AdvanceRequestDialog from '@/components/beneficiary/my-share/AdvanceRequestDialog';

interface AdvanceContext {
  beneficiaryId: string;
  beneficiaryName: string;
  fiscalYearId: string;
  estimatedShare: number;
  paidAdvances: number;
  carryforwardBalance: number;
  isFiscalYearActive: boolean;
  minAmount: number;
  maxPercentage: number;
  enabled: boolean;
}

interface BeneficiaryAdvanceCardProps {
  pendingAdvanceCount: number;
  advanceContext: AdvanceContext;
}

/**
 * بطاقة السلفة في Dashboard — S6-5: تفتح Dialog محلياً بدلاً من التنقل.
 * يعاد استخدام AdvanceRequestDialog من صفحة "حصتي" بنفس البروبس.
 */
const BeneficiaryAdvanceCard = ({ pendingAdvanceCount, advanceContext }: BeneficiaryAdvanceCardProps) => {
  const text = pendingAdvanceCount > 0
    ? ADVANCE_CARD_COPY.withPending(pendingAdvanceCount)
    : ADVANCE_CARD_COPY.default;

  const canRequest = advanceContext.enabled && advanceContext.isFiscalYearActive;
  const disabledHint = !advanceContext.enabled
    ? 'طلب السلفة معطّل من الإعدادات'
    : !advanceContext.isFiscalYearActive
      ? 'طلب السلفة متاح فقط خلال السنة المالية النشطة'
      : null;

  return (
    <Card className="shadow-sm border-accent/30">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
              <Banknote className="w-5 h-5 text-accent-foreground" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-sm">{ADVANCE_CARD_COPY.title}</p>
              <p className="text-xs text-muted-foreground">{disabledHint ?? text}</p>
            </div>
          </div>
          <div className="flex flex-col items-stretch sm:items-end gap-1 shrink-0">
            {canRequest ? (
              <AdvanceRequestDialog
                beneficiaryId={advanceContext.beneficiaryId}
                beneficiaryName={advanceContext.beneficiaryName}
                fiscalYearId={advanceContext.fiscalYearId}
                estimatedShare={advanceContext.estimatedShare}
                paidAdvances={advanceContext.paidAdvances}
                carryforwardBalance={advanceContext.carryforwardBalance}
                isFiscalYearActive={advanceContext.isFiscalYearActive}
                minAmount={advanceContext.minAmount}
                maxPercentage={advanceContext.maxPercentage}
              />
            ) : (
              <button
                type="button"
                disabled
                title={disabledHint ?? undefined}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-input bg-background text-muted-foreground opacity-60 cursor-not-allowed"
              >
                <Banknote className="w-4 h-4" />
                طلب سلفة
              </button>
            )}
            <Link
              to="/beneficiary/my-share"
              className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline text-center sm:text-end"
            >
              عرض السجل الكامل
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BeneficiaryAdvanceCard;
