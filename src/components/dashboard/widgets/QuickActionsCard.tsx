import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QUICK_ACTIONS } from '@/constants/quickActions';
import { ACCOUNTANT_EXCLUDED_ROUTES } from '@/constants/navigation';
import SectionHeading from '@/components/layout/SectionHeading';

interface QuickActionsCardProps {
  role: string | null;
}

/** الإجراءات السريعة في لوحة التحكم — بلاطات أيقونات */
const QuickActionsCard = ({ role }: QuickActionsCardProps) => {
  const actions = useMemo(() => {
    const raw = QUICK_ACTIONS[role ?? ''];
    if (!raw) return null;
    // تحصين دفاعي: لا تعرض أي إجراء يقع ضمن مسارات ممنوعة عن المحاسب
    if (role === 'accountant') {
      return raw.filter(a => !ACCOUNTANT_EXCLUDED_ROUTES.some(ex => a.to.startsWith(ex)));
    }
    return raw;
  }, [role]);

  if (!actions || actions.length === 0) return null;

  return (
    <section aria-label="إجراءات سريعة">
      <SectionHeading title="إجراءات سريعة" />
      <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3">
        {actions.map((action) => (
          <QuickAction key={action.to} to={action.to} icon={<action.icon className={`w-5 h-5 ${action.iconClass}`} aria-hidden="true" />} label={action.label} />
        ))}
      </div>
    </section>
  );
};

/** زر إجراء سريع — مكوّن خارج render لمنع إعادة التعريف */
const QuickAction = memo(function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="flex flex-col items-center gap-2 rounded-2xl border bg-card px-1 py-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">{icon}</span>
      <span className="text-xs font-bold text-foreground text-center leading-tight">{label}</span>
    </Link>
  );
});

export default memo(QuickActionsCard);
