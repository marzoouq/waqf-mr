/**
 * شريط العلوي للديسكتوب في لوحة التحكم
 */
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Lock, User } from 'lucide-react';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/notifications';
import { FiscalYearSelector, WaqfInfoBar } from '@/components/layout';
import { lazy, Suspense } from 'react';
const GlobalSearch = lazy(() => import('@/components/search/GlobalSearch'));
import { ROLE_LABELS } from '@/constants/roles';

interface DesktopTopBarProps {
  fiscalYearId: string;
  onFiscalYearChange: (id: string) => void;
  showAll: boolean;
  isClosed: boolean;
}

const DesktopTopBar: React.FC<DesktopTopBarProps> = ({
  fiscalYearId, onFiscalYearChange, showAll, isClosed,
}) => {
  const { user, role } = useAuth();

  return (
    <div className="hidden lg:flex items-center justify-between">
      <WaqfInfoBar />
      <div className="flex items-center gap-3 px-4 py-2">
        <Suspense fallback={null}><GlobalSearch /></Suspense>
        <FiscalYearSelector value={fiscalYearId} onChange={onFiscalYearChange} showAll={showAll} />
        {isClosed && (
          <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-md border border-warning/30 print:hidden">
            <Lock className="w-3 h-3" /> مقفلة
          </span>
        )}
        <Link to={(role === 'admin' || role === 'accountant') ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
            <BookOpen className="w-5 h-5" />
          </Button>
        </Link>
        <ThemeToggle />
        <NotificationBell />
        {user && (
          <div className="flex items-center gap-2 border-r border-border pr-3 mr-1">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
              <User className="w-4 h-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-foreground leading-tight truncate max-w-[120px]">
                {user.email?.split('@')[0] || 'مستخدم'}
              </span>
              <Badge variant="secondary" className="text-[11px] px-1.5 py-0 h-4 leading-none">
                {ROLE_LABELS[role || ''] || role || '—'}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DesktopTopBar;
