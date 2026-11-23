/**
 * بطاقات ملخص صفحة التقارير (الهوية الوقفية) — الأرقام كما تصل دون أي حساب.
 */
import { FigureTile, FigureTileGrid } from '@/components/common';
import { DOMAIN_ICONS } from '@/constants/domainIcons';

interface ReportsSummaryCardsProps {
  totalIncome: number;
  totalExpenses: number;
  netRevenue: number;
  propertyCount: number;
  isLoading: boolean;
}

const ReportsSummaryCards = ({ totalIncome, totalExpenses, netRevenue, propertyCount, isLoading }: ReportsSummaryCardsProps) => (
  <FigureTileGrid isLoading={isLoading}>
    <FigureTile label="إجمالي الدخل" value={totalIncome} icon={DOMAIN_ICONS.income} tone="income" />
    <FigureTile label="إجمالي المصروفات" value={totalExpenses} icon={DOMAIN_ICONS.expense} tone="expense" />
    <FigureTile label="صافي الريع" value={netRevenue} icon={DOMAIN_ICONS.share} tone="share" />
    <FigureTile label="عدد العقارات" value={propertyCount} icon={DOMAIN_ICONS.property} unit="count" />
  </FigureTileGrid>
);

export default ReportsSummaryCards;
