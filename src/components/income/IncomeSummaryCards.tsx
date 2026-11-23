/**
 * ملخص الدخل (الهوية الوقفية) — الأرقام تُعرض كما تصل من الصفحة دون أي حساب.
 */
import { Hash, Calculator, Star } from 'lucide-react';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { fmt } from '@/utils/format/format';

interface IncomeSummaryCardsProps {
  isLoading: boolean;
  totalIncome: number;
  summaryCards: {
    count: number;
    avg: number;
    topSource: string;
    topSourceAmount: number;
  };
}

const IncomeSummaryCards = ({ isLoading, totalIncome, summaryCards }: IncomeSummaryCardsProps) => (
  <FigureTileGrid isLoading={isLoading}>
    <FigureTile label="إجمالي الدخل" value={totalIncome} icon={DOMAIN_ICONS.income} tone="income" />
    <FigureTile label="عدد السجلات" value={summaryCards.count} icon={Hash} unit="count" />
    <FigureTile label="متوسط الدخل" value={summaryCards.avg} icon={Calculator} />
    <FigureTile
      label="أعلى مصدر" value={summaryCards.topSource} icon={Star} tone="share" unit="text"
      hint={<><bdi dir="ltr" className="num">{fmt(summaryCards.topSourceAmount)}</bdi> ر.س</>}
    />
  </FigureTileGrid>
);

export default IncomeSummaryCards;
