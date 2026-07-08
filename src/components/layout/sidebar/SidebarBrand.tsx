/**
 * SidebarBrand — شعار/اسم الوقف وأزرار التبديل (presentational)
 */
import { Button } from '@/components/ui/button';
import { Building2, PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SidebarBrandProps {
  waqfName: string;
  waqfLogoUrl?: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const SidebarBrand: React.FC<SidebarBrandProps> = ({
  waqfName, waqfLogoUrl, sidebarOpen, setSidebarOpen, setMobileSidebarOpen,
}) => (
  <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
    <div className={cn('flex items-center gap-3', !sidebarOpen && 'lg:justify-center')}>
      <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shrink-0 shadow-gold overflow-hidden">
        {waqfLogoUrl ? (
          <img src={waqfLogoUrl} alt="شعار الوقف" className="w-full h-full object-contain rounded-xl p-0.5" />
        ) : (
          <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
        )}
      </div>
      <span className={cn('font-arabic font-bold text-lg text-sidebar-foreground truncate max-w-[150px]', !sidebarOpen && 'lg:hidden')}>
        {waqfName}
      </span>
    </div>
    <Button
      variant="ghost"
      size="icon"
      aria-label={sidebarOpen ? 'طي القائمة الجانبية' : 'توسيع القائمة الجانبية'}
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className="text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {sidebarOpen ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
    </Button>

    <Button
      variant="ghost"
      size="icon"
      aria-label="إغلاق القائمة الجانبية"
      onClick={() => setMobileSidebarOpen(false)}
      className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
    >
      <X className="w-5 h-5" />
    </Button>
  </div>
);
