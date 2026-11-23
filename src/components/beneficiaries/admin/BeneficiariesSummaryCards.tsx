/**
 * ملخص المستفيدين (الهوية الوقفية) — الأعداد والنسب كما تصل من الصفحة.
 */
import { Percent, AlertTriangle, UserCheck, Wallet } from 'lucide-react';
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';

interface BeneficiariesSummaryCardsProps {
  isLoading: boolean;
  total: number;
  active: number;
  totalPercentage: number;
  percentageExceeds: boolean;
}

const BeneficiariesSummaryCards = ({ isLoading, total, active, totalPercentage, percentageExceeds }: BeneficiariesSummaryCardsProps) => (
  <FigureTileGrid isLoading={isLoading}>
    <FigureTile label="إجمالي المستفيدين" value={total} icon={DOMAIN_ICONS.beneficiaries} unit="count" />
    <FigureTile label={`نشطون (نسبة > 0)`} value={active} icon={UserCheck} tone="success" unit="count" />
    <FigureTile
      label="مجموع النسب" value={`${totalPercentage.toFixed(2)}%`} unit="percent"
      icon={percentageExceeds ? AlertTriangle : Percent} tone={percentageExceeds ? 'expense' : 'share'}
      hint={percentageExceeds ? <span className="font-bold text-destructive">تجاوز 100%!</span> : undefined}
    />
    <FigureTile
      label="متوسط الحصة" unit="percent" icon={Wallet}
      value={`${total > 0 ? (totalPercentage / total).toFixed(1) : 0}%`}
    />
  </FigureTileGrid>
);

export default BeneficiariesSummaryCards;
