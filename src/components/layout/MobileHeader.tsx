/**
 * رأس الصفحة للموبايل في لوحة التحكم
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Menu } from 'lucide-react';
import NotificationBell from '@/components/notifications/NotificationBell';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { ROUTE_TITLES } from '@/components/layout/constants';

interface MobileHeaderProps {
  onOpenSidebar: () => void;
  fiscalYearLabel?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenSidebar, fiscalYearLabel }) => {
  const { role } = useAuth();
  const location = useLocation();

  const title = ROUTE_TITLES[location.pathname] ||
    Object.keys(ROUTE_TITLES)
      .filter(r => location.pathname.startsWith(r + '/'))
      .sort((a, b) => b.length - a.length)
      .map(r => ROUTE_TITLES[r])[0] ||
    'إدارة الوقف';

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between p-3 gradient-hero lg:hidden" role="banner">
      <Button variant="ghost" size="icon" aria-label="فتح القائمة الجانبية" onClick={onOpenSidebar} className="text-sidebar-foreground">
        <Menu className="w-6 h-6" aria-hidden="true" />
      </Button>
      <div className="flex flex-col items-center">
        <h1 className="font-arabic font-bold text-base text-sidebar-foreground leading-tight">{title}</h1>
        {fiscalYearLabel && (
          <span className="text-[11px] text-sidebar-foreground/70 leading-none">{fiscalYearLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link to={(role === 'admin' || role === 'accountant') ? '/dashboard/bylaws' : '/beneficiary/bylaws'} aria-label="نظام الوقف">
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
            <BookOpen className="w-5 h-5" aria-hidden="true" />
          </Button>
        </Link>
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
};

export default MobileHeader;
