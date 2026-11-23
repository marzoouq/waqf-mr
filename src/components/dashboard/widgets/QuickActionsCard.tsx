import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QUICK_ACTIONS, QUICK_ACTION_GROUPS } from '@/constants/quickActions';
import type { QuickActionItem } from '@/constants/quickActions';
import { ACCOUNTANT_EXCLUDED_ROUTES } from '@/constants/navigation';
import SectionHeading from '@/components/layout/SectionHeading';

interface QuickActionsCardProps {
  role: string | null;
}

/** الإجراءات السريعة — مسارات عمل (التأجير، المحاسبة، الحوكمة) بدل صف أزرار متفرقة */
const QuickActionsCard = ({ role }: QuickActionsCardProps) => {
  const lanes = useMemo(() => {
    const raw = QUICK_ACTIONS[role ?? ''];
    if (!raw) return [];
    // تحصين دفاعي: لا تعرض أي إجراء يقع ضمن مسارات ممنوعة عن المحاسب
    const allowed = role === 'accountant'
      ? raw.filter(a => !ACCOUNTANT_EXCLUDED_ROUTES.some(ex => a.to.startsWith(ex)))
      : raw;
    return QUICK_ACTION_GROUPS
      .map((g) => ({ ...g, actions: allowed.filter((a) => a.group === g.id) }))
      .filter((g) => g.actions.length > 0);
  }, [role]);

  if (lanes.length === 0) return null;

  return (
    <section aria-label="إجراءات سريعة">
      <SectionHeading title="إجراءات سريعة" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {lanes.map((lane) => (
          <div key={lane.id} className="rounded-2xl border bg-card p-3 sm:p-4 shadow-sm">
            <h3 className="mb-2.5 px-1 text-xs font-bold text-muted-foreground">{lane.title}</h3>
            <div className="grid grid-cols-2 gap-2">
              {lane.actions.map((action) => <QuickAction key={action.to} action={action} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/** زر إجراء سريع — مكوّن خارج render لمنع إعادة التعريف */
const QuickAction = memo(function QuickAction({ action }: { action: QuickActionItem }) {
  const Icon = action.icon;
  return (
    <Link
      to={action.to}
      aria-label={action.label}
      className="flex items-center gap-2 rounded-xl border bg-background px-2.5 py-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`h-4 w-4 ${action.iconClass}`} aria-hidden="true" />
      </span>
      <span className="text-xs sm:text-sm font-bold text-foreground leading-tight">{action.label}</span>
    </Link>
  );
});

export default memo(QuickActionsCard);
