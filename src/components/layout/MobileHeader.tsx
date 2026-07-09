/**
 * رأس الصفحة للموبايل في لوحة التحكم
 * ملاحظة: زر "نظام الوقف" مُزال — الرابط متاح في القائمة الجانبية لتفادي التكرار الثلاثي.
 */
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import ThemeToggle from '@/components/theme/ThemeToggle';
import { ROUTE_TITLES } from '@/constants/navigation';

interface MobileHeaderProps {
  onOpenSidebar: () => void;
  fiscalYearLabel?: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenSidebar, fiscalYearLabel }) => {
  const location = useLocation();

  const title = ROUTE_TITLES[location.pathname] ||
    Object.keys(ROUTE_TITLES)
      .filter(r => location.pathname.startsWith(r + '/'))
      .sort((a, b) => b.length - a.length)
      .map(r => ROUTE_TITLES[r])[0] ||
    'إدارة الوقف';

  return (
    <header className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between p-3 gradient-hero lg:hidden" role="banner">
      <Button variant="ghost" size="icon" aria-label="فتح القائمة الجانبية" onClick={onOpenSidebar} className="text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-primary/60">
        <Menu className="w-6 h-6" aria-hidden="true" />
      </Button>
      <div className="flex flex-col items-center">
        <p role="heading" aria-level={1} className="font-arabic font-bold text-base text-sidebar-foreground leading-tight m-0">{title}</p>
        {fiscalYearLabel && (
          <span className="text-[11px] text-sidebar-foreground/70 leading-none">{fiscalYearLabel}</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  );
};

export default MobileHeader;

