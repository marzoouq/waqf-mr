/**
 * المربع المالي القيادي — أربع بطاقات تعرض أرقام الخادم كما هي.
 * لا حساب هنا: كل رقم يأتي جاهزاً من buildExecutiveCards.
 */
import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Clock } from 'lucide-react';
import SectionHeading from '@/components/layout/SectionHeading';
import YoYBadge from '@/components/dashboard/kpi/YoYBadge';
import { Skeleton } from '@/components/ui/skeleton';
import { DOMAIN_ICONS } from '@/constants/domainIcons';
import { fmt } from '@/utils/format/format';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import type { ExecutiveCard, ExecutiveCardId } from '@/utils/dashboard/executiveSummary';
import { PENDING_CLOSURE_TEXT } from '@/utils/dashboard/executiveSummary';
import type { KpiItem } from '@/types/dashboard';

const CARD_ICON: Record<ExecutiveCardId, LucideIcon> = {
  income: DOMAIN_ICONS.income,
  expenses: DOMAIN_ICONS.expense,
  waqf: DOMAIN_ICONS.accounts,
  distributions: DOMAIN_ICONS.distribution,
};

/** شريط اللون على حافة البطاقة — من ألوان الهوية فقط */
const CARD_ACCENT: Record<ExecutiveCardId, string> = {
  income: 'border-s-success',
  expenses: 'border-s-destructive/70',
  waqf: 'border-s-bronze',
  distributions: 'border-s-bronze',
};

const ICON_TONE: Record<ExecutiveCardId, string> = {
  income: 'bg-success-muted text-success-foreground',
  expenses: 'bg-destructive/10 text-destructive',
  waqf: 'bg-primary-foreground/10 text-sidebar-primary',
  distributions: 'bg-bronze-soft text-bronze-foreground',
};

/** بطاقة ريع الوقف هي البطاقة القيادية: سطح وقفي أخضر بزخرفة النجمة */
const HERO_SURFACE = 'waqf-surface border-transparent [&_.text-foreground]:text-ink-foreground [&_.text-muted-foreground]:text-sidebar-foreground/75 [&_.bg-muted]:bg-primary-foreground/10';

interface ExecutiveFinancialCardsProps {
  cards: ExecutiveCard[];
  isLoading: boolean;
  isClosedYear: boolean;
  expenseKpi: KpiItem | null;
}

const Amount = ({ value, large }: { value: number; large?: boolean }) => (
  <span className={cn('tabular-nums font-bold text-foreground', large ? 'text-2xl sm:text-[1.7rem] leading-tight' : 'text-sm')}>
    {fmt(value)}
    <span className={cn('ms-1 font-medium text-muted-foreground', large ? 'text-sm' : 'text-xs')}>ر.س</span>
  </span>
);

const ExecutiveCardView = memo(function ExecutiveCardView({ card, expenseKpi }: { card: ExecutiveCard; expenseKpi: KpiItem | null }) {
  const Icon = CARD_ICON[card.id];
  return (
    <Link
      to={card.link}
      aria-label={`فتح ${card.title}`}
      className={cn(
        'group flex h-full flex-col rounded-2xl border border-s-4 bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        card.id === 'waqf' ? HERO_SURFACE : CARD_ACCENT[card.id],
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', ICON_TONE[card.id])}>
          <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
        </span>
        <h3 className="flex-1 text-sm font-bold text-foreground">{card.title}</h3>
        <YoYBadge changePercent={card.yoyChange} invertColor={card.invertChange} />
        <ChevronLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-0.5" aria-hidden="true" />
      </div>

      {card.lead && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">{card.lead.label}</p>
          {card.lead.amount === null ? (
            <p className="mt-1 flex items-center gap-1.5 text-base font-bold text-muted-foreground">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {PENDING_CLOSURE_TEXT}
            </p>
          ) : (
            <p className="mt-0.5"><Amount value={card.lead.amount} large /></p>
          )}
        </div>
      )}

      {card.rows.length > 0 && (
        <dl className={cn('space-y-2', card.lead ? 'mt-4 border-t pt-3' : 'mt-4')}>
          {card.rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-2">
              <dt className="text-xs text-muted-foreground">
                {row.label}
                {row.note && <span className="ms-1 rounded bg-muted px-1 text-[10px]">{row.note}</span>}
              </dt>
              <dd>{row.amount === null ? '—' : <Amount value={row.amount} large={!card.lead} />}</dd>
            </div>
          ))}
        </dl>
      )}

      {card.id === 'expenses' && expenseKpi && (
        <p className="mt-3 text-xs text-muted-foreground">
          {expenseKpi.label} من الدخل:{' '}
          <span className={cn('tabular-nums font-bold', expenseKpi.color)}>{expenseKpi.value}{expenseKpi.suffix}</span>
        </p>
      )}

      {card.footnote && <p className="mt-auto pt-3 text-[11px] text-muted-foreground">{card.footnote}</p>}
    </Link>
  );
});

const ExecutiveFinancialCards = ({ cards, isLoading, isClosedYear, expenseKpi }: ExecutiveFinancialCardsProps) => {
  const gridCols = cards.length > 2 ? 'sm:grid-cols-2 xl:grid-cols-4' : 'sm:grid-cols-2';
  return (
    <section aria-label="المركز المالي للسنة">
      <SectionHeading
        title="المركز المالي للسنة"
        extra={
          <span className="text-xs text-muted-foreground">
            {isClosedYear ? 'كما صدر في الإقفال' : 'تقديري حتى الإقفال'}
          </span>
        }
      />
      {isLoading ? (
        <div className={cn('grid grid-cols-1 gap-3', gridCols)}>
          {[0, 1, 2, 3].slice(0, cards.length || 4).map((i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
        </div>
      ) : (
        <div className={cn('grid grid-cols-1 gap-3 sm:gap-4', gridCols)}>
          {cards.map((card) => <ExecutiveCardView key={card.id} card={card} expenseKpi={expenseKpi} />)}
        </div>
      )}
    </section>
  );
};

export default memo(ExecutiveFinancialCards);
