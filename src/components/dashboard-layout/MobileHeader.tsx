/**
 * رأس الصفحة للموبايل في لوحة التحكم
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Menu } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import ThemeToggle from '@/components/ThemeToggle';
import { ROUTE_TITLES } from '@/components/dashboard-layout/constants';

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
    <div className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between p-3 gradient-hero lg:hidden">
      <Button variant="ghost" size="icon" onClick={onOpenSidebar} className="text-sidebar-foreground">
        <Menu className="w-6 h-6" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="font-arabic font-bold text-base text-sidebar-foreground leading-tight">{title}</span>
        {fiscalYearLabel && (
          <span className="text-[11px] text-sidebar-foreground/70 leading-none">{fiscalYearLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link to={(role === 'admin' || role === 'accountant') ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
            <BookOpen className="w-5 h-5" />
          </Button>
        </Link>
        <ThemeToggle />
        <NotificationBell />
      </div>
    </div>
  );
};

export default MobileHeader;
