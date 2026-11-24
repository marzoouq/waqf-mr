import { fmt, fmtDate } from '@/utils/format/format';
import { DISTRIBUTIONS_LABELS } from '@/constants/beneficiaryCopy';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import SectionHeading from '@/components/layout/SectionHeading';
import { ltr } from '@/utils/format/bidi';

interface Distribution {
  id: string;
  amount: number;
  date: string;
  status: string;
  fiscal_year_label?: string | null;
}

interface BeneficiaryRecentDistributionsProps {
  distributions: Distribution[];
}

const BeneficiaryRecentDistributions = ({ distributions }: BeneficiaryRecentDistributionsProps) => {
  const Icon = DOMAIN_ICONS.share;
  return (
    <section>
      <SectionHeading title={DISTRIBUTIONS_LABELS.recent} action={{ label: 'عرض الكل', to: '/beneficiary/my-share' }} />
      <div className="rounded-2xl border bg-card shadow-sm divide-y">
        {distributions.length === 0 ? (
          <p className="text-center text-muted-foreground py-8 text-sm">لا توجد توزيعات مسجلة</p>
        ) : (
          distributions.map((d) => {
            const paid = d.status === 'paid';
            return (
              <div key={d.id} className="flex items-center gap-3 p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">
                    {d.fiscal_year_label ? `ريع ${ltr(d.fiscal_year_label)}` : 'توزيع'}
                  </p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground tabular-nums">
                    <span className={paid ? 'rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success' : 'rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning'}>
                      {paid ? 'سُلّم' : 'معلق'}
                    </span>
                    {fmtDate(d.date)}
                  </p>
                </div>
                <p className="text-sm font-bold tabular-nums text-foreground whitespace-nowrap">
                  {fmt(Number(d.amount))} <span className="text-xs font-normal text-muted-foreground">ر.س</span>
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default BeneficiaryRecentDistributions;
