/**
 * المحفظة الوقفية — أعداد العقارات والعقود والمستفيدين والإشغال الحالي.
 * الأعداد جاهزة من الخادم؛ الإشغال يظهر للسنة النشطة فقط لأنه يمثل الوضع الحالي.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import SectionHeading from '@/components/layout/SectionHeading';
import { Progress } from '@/components/ui/progress';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { fmtInt } from '@/utils/format/format';
import type { LucideIcon } from 'lucide-react';

interface PortfolioCardProps {
  portfolio: {
    properties: number;
    activeContracts: number;
    beneficiaries: number;
    occupancy: { rented_units: number; total_units: number; rate: number } | null;
  };
}

const CountRow = ({ to, icon: Icon, label, value }: { to: string; icon: LucideIcon; label: string; value: number }) => (
  <Link
    to={to}
    className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  >
    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
    </span>
    <span className="flex-1 text-sm text-foreground">{label}</span>
    <span className="text-lg font-bold tabular-nums text-foreground">{fmtInt(value)}</span>
  </Link>
);

const PortfolioCard = ({ portfolio }: PortfolioCardProps) => {
  const occ = portfolio.occupancy;
  return (
    <section aria-label="المحفظة الوقفية" className="flex h-full flex-col">
      <SectionHeading title="المحفظة الوقفية" />
      <div className="flex-1 rounded-2xl border bg-card p-2.5 sm:p-3 shadow-sm">
        <div className="divide-y">
          <CountRow to="/dashboard/properties" icon={DOMAIN_ICONS.property} label="العقارات" value={portfolio.properties} />
          <CountRow to="/dashboard/contracts" icon={DOMAIN_ICONS.contract} label="العقود النشطة" value={portfolio.activeContracts} />
          <CountRow to="/dashboard/beneficiaries" icon={DOMAIN_ICONS.beneficiaries} label="المستفيدون النشطون" value={portfolio.beneficiaries} />
        </div>
        {occ && occ.total_units > 0 && (
          <div className="mt-2 rounded-xl bg-muted/40 p-3">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">الإشغال الحالي</span>
              <span className="tabular-nums text-foreground">
                <span className="font-bold">{occ.rate}%</span>
                <span className="ms-1.5 text-muted-foreground">({fmtInt(occ.rented_units)} من {fmtInt(occ.total_units)} وحدة)</span>
              </span>
            </div>
            <Progress value={occ.rate} className="mt-2 h-1.5" />
          </div>
        )}
      </div>
    </section>
  );
};

export default memo(PortfolioCard);
