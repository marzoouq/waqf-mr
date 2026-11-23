/**
 * الهيدر الموحّد للجوال — شريط وقفي واحد: القائمة، شعار الوقف (بيانات الصك)، اسم الوقف والبوابة، التنبيهات.
 * عنوان الصفحة يبقى في رأس الصفحة نفسها لتفادي تكراره مرتين على الشاشة.
 */
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { NotificationBell } from '@/components/notifications';
import ThemeToggle from '@/components/theme/ThemeToggle';
import WaqfInfoBar from '@/components/layout/WaqfInfoBar';

interface MobileHeaderProps {
  onOpenSidebar: () => void;
  waqfName: string;
  portalLabel: string;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onOpenSidebar, waqfName, portalLabel }) => (
  <header className="fixed top-0 right-0 left-0 z-40 h-14 flex items-center gap-2 px-2 gradient-hero lg:hidden print:hidden" role="banner">
    <Button variant="ghost" size="icon" aria-label="فتح القائمة الجانبية" onClick={onOpenSidebar} className="text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-primary/60">
      <Menu className="w-6 h-6" aria-hidden="true" />
    </Button>
    <WaqfInfoBar trigger="logo" />
    <div className="min-w-0 flex-1 leading-tight">
      <p className="font-display font-bold text-[15px] text-sidebar-foreground truncate m-0">{waqfName}</p>
      <p className="text-[11px] text-sidebar-primary truncate m-0">{portalLabel}</p>
    </div>
    <div className="flex items-center gap-0.5 text-sidebar-foreground [&_button]:text-sidebar-foreground [&_button:hover]:bg-sidebar-accent">
      <ThemeToggle />
      <NotificationBell />
    </div>
  </header>
);

export default MobileHeader;
