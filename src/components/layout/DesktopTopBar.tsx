/**
 * الشريط العلوي الموحّد للكمبيوتر — تاريخ اليوم (هجري وميلادي) يميناً، وأدوات السياق يساراً:
 * البحث، السنة المالية، معلومات الوقف، الوضع الليلي، التنبيهات، المستخدم.
 */
import { useAuth } from '@/hooks/auth/session/useAuthContext';
import { CalendarDays } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { NotificationBell } from '@/components/notifications';
import FiscalYearSelector from '@/components/layout/FiscalYearSelector';
import WaqfInfoBar from '@/components/layout/WaqfInfoBar';
import { lazy, Suspense } from 'react';
import { ROLE_LABELS } from '@/constants/roles';
import { useTodayLabel } from '@/hooks/ui/useTodayLabel';
const GlobalSearch = lazy(() => import('@/components/search/GlobalSearch'));

interface DesktopTopBarProps {
  fiscalYearId: string;
  onFiscalYearChange: (id: string) => void;
  showAll: boolean;
  isClosed: boolean;
}

const DesktopTopBar: React.FC<DesktopTopBarProps> = ({ fiscalYearId, onFiscalYearChange, showAll }) => {
  const { user, role } = useAuth();
  const today = useTodayLabel();
  const userName = user?.email?.split('@')[0] || 'مستخدم';
  const roleLabel = ROLE_LABELS[role || ''] || role || '—';

  return (
    <div className="hidden lg:flex items-center gap-3 px-6 py-3 border-b border-border/70 bg-background print:hidden">
      <div className="flex items-center gap-2 text-xs text-muted-foreground min-w-0">
        <CalendarDays className="w-4 h-4 text-bronze shrink-0" aria-hidden="true" />
        <span className="truncate">{today.weekday} {today.hijri} · {today.gregorian}</span>
      </div>
      <div className="flex-1" />
      <Suspense fallback={null}><GlobalSearch /></Suspense>
      <FiscalYearSelector value={fiscalYearId} onChange={onFiscalYearChange} showAll={showAll} />
      <WaqfInfoBar trigger="icon" />
      <div className="flex items-center gap-1 [&_button]:text-foreground [&_button:hover]:bg-accent">
        <ThemeToggle />
        <NotificationBell />
      </div>
      {user && (
        <div className="flex items-center gap-2 border-s border-border ps-3 ms-1" aria-label={`المستخدم الحالي: ${userName} — ${roleLabel}`}>
          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-secondary text-secondary-foreground font-display font-bold" aria-hidden="true">
            {userName.charAt(0)}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{userName}</span>
            <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopTopBar;
