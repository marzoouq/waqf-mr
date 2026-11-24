import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import SectionHeading from '@/components/layout/SectionHeading';

interface BeneficiaryQuickLinksProps {
  /** محفوظ للتوافق — الحصة والإفصاح صارا في بطاقة «حصتي» والشريط السفلي فلا يتكرران هنا */
  role: string | null;
}

const QUICK_LINKS = [
  { title: 'التقارير', icon: DOMAIN_ICONS.reports, path: '/beneficiary/financial-reports', tone: 'bg-primary/10 text-primary' },
  { title: 'اللائحة', icon: DOMAIN_ICONS.bylaws, path: '/beneficiary/bylaws', tone: 'bg-secondary/15 text-secondary-foreground' },
  { title: 'الأرشيف', icon: DOMAIN_ICONS.archive, path: '/beneficiary/archive', tone: 'bg-accent text-accent-foreground' },
] as const;

const BeneficiaryQuickLinks = (_props: BeneficiaryQuickLinksProps) => (
  <section>
    <SectionHeading title="الوصول السريع" />
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 lg:grid-cols-1 lg:gap-0 lg:divide-y lg:rounded-2xl lg:border lg:bg-card lg:shadow-sm lg:overflow-hidden">
      {QUICK_LINKS.map((link) => (
        <Link
          key={link.path}
          to={link.path}
          className="group flex flex-col items-center gap-2 rounded-2xl border bg-card p-3 sm:p-4 shadow-sm transition-colors hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:flex-row lg:gap-3 lg:rounded-none lg:border-0 lg:shadow-none lg:px-4 lg:py-3 lg:hover:bg-muted/50 lg:hover:shadow-none"
        >
          <span className={`flex h-11 w-11 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-xl ${link.tone}`}>
            <link.icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-sm font-bold text-foreground lg:flex-1">{link.title}</span>
          <ChevronLeft className="hidden lg:block h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
        </Link>
      ))}
    </div>
  </section>
);

export default BeneficiaryQuickLinks;
