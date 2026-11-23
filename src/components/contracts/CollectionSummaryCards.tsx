/**
 * بطاقات ملخص التحصيل + شريط التقدم العام (الهوية الوقفية) — الأرقام كما تصل.
 */
import { Banknote, AlertTriangle, Percent } from 'lucide-react';
import { FigureTile, FigureTileGrid, ProgressSummaryBar } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { fmt } from '@/utils/format/format';
import type { CollectionSummary } from '@/hooks/page/admin/financial/useCollectionData';

interface CollectionSummaryCardsProps {
  summary: CollectionSummary;
  expectedLabel: string;
}

const Amount = ({ value }: { value: number }) => <bdi dir="ltr" className="num font-medium text-foreground">{fmt(value)}</bdi>;

export default function CollectionSummaryCards({ summary, expectedLabel }: CollectionSummaryCardsProps) {
  const hasSplit = summary.overdueFromPreviousAmount > 0 || summary.overdueInYearAmount > 0;
  return (
    <>
      <FigureTileGrid>
        <FigureTile label={expectedLabel} value={summary.totalExpected} icon={Banknote} />
        <FigureTile label="المحصّل" value={summary.totalCollected} icon={DOMAIN_ICONS.income} tone="success" />
        <FigureTile
          label="المتأخر" value={summary.totalOverdue} icon={AlertTriangle} tone={summary.totalOverdue > 0 ? 'expense' : 'neutral'}
          hint={hasSplit ? (
            <span className="flex flex-col gap-0.5 leading-tight">
              {summary.overdueFromPreviousAmount > 0 && <span>من سنوات سابقة: <Amount value={summary.overdueFromPreviousAmount} /></span>}
              {summary.overdueInYearAmount > 0 && <span>هذه السنة: <Amount value={summary.overdueInYearAmount} /></span>}
            </span>
          ) : undefined}
        />
        <FigureTile label="نسبة التحصيل" value={`${summary.collectionRate.toFixed(0)}%`} unit="percent" icon={Percent} tone="share" />
      </FigureTileGrid>

      <ProgressSummaryBar
        label="معدل التحصيل العام" rate={summary.collectionRate}
        meta={<>
          <bdi dir="ltr" className="num">{summary.completeCount}</bdi> مكتمل من <bdi dir="ltr" className="num">{summary.total}</bdi> عقد
          {summary.overdueCount > 0 && <span className="text-destructive ms-2">• <bdi dir="ltr" className="num">{summary.overdueCount}</bdi> متأخر</span>}
        </>}
      />
    </>
  );
}
