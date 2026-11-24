/**
 * SidebarBrand — شعار/اسم الوقف وأزرار التبديل (presentational)
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PanelRightOpen, PanelRightClose, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { OFFICIAL_LOGO_SRC } from '@/components/branding/WaqfEmblem';

interface SidebarBrandProps {
  waqfName: string;
  portalLabel: string;
  waqfLogoUrl?: string | null;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
}

export const SidebarBrand: React.FC<SidebarBrandProps> = ({
  waqfName, portalLabel, waqfLogoUrl, sidebarOpen, setSidebarOpen, setMobileSidebarOpen,
}) => {
  // نمط adjusting-state-during-render الرسمي من React لإعادة الضبط عند تغيّر prop
  const [imgError, setImgError] = useState(false);
  const [lastUrl, setLastUrl] = useState(waqfLogoUrl);
  if (lastUrl !== waqfLogoUrl) {
    setLastUrl(waqfLogoUrl);
    setImgError(false);
  }
  const showLogo = !!waqfLogoUrl && !imgError;
  return (
  <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
    <div className={cn('flex items-center gap-3', !sidebarOpen && 'lg:justify-center')}>
      <div className="w-11 h-11 bg-card rounded-xl flex items-center justify-center shrink-0 ring-1 ring-sidebar-primary/40 overflow-hidden">
        <img
          src={showLogo ? waqfLogoUrl! : OFFICIAL_LOGO_SRC}
          alt="شعار الوقف"
          className="w-full h-full object-contain rounded-xl p-0.5"
          onError={() => setImgError(true)}
        />
      </div>
      <div className={cn('min-w-0 leading-tight', !sidebarOpen && 'lg:hidden')}>
        <span className="block font-display font-bold text-base text-sidebar-foreground truncate max-w-[150px]">{waqfName}</span>
        <span className="block text-[11px] text-sidebar-primary truncate max-w-[150px]">{portalLabel}</span>
      </div>
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
};
