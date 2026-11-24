import { Link } from 'react-router-dom';
import { Banknote, Lock } from 'lucide-react';
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
    <section aria-label={ADVANCE_CARD_COPY.title} className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground">
          <Banknote className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-foreground">{ADVANCE_CARD_COPY.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{disabledHint ?? text}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground" aria-label={disabledHint ?? 'طلب سلفة'}>
            <Lock className="h-3 w-3" aria-hidden="true" />
            غير متاح الآن
          </span>
        )}
        <Link to="/beneficiary/my-share" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
          عرض السجل الكامل
        </Link>
      </div>
    </section>
  );
};

export default BeneficiaryAdvanceCard;
