/**
 * مكون الشريط الجانبي (Sidebar)
 * يعرض قائمة التنقل ومعلومات المستخدم وزر تسجيل الخروج.
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Building2, LogOut, Menu, X, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/constants';
import { useWaqfInfo } from '@/hooks/page/useAppSettings';
import { usePrefetchPages } from '@/hooks/financial/usePrefetchPages';
import { useUnreadMessages } from '@/hooks/ui/useUnreadMessages';

interface SidebarContentProps {
  links: Array<{ to: string; icon: React.ComponentType<{ className?: string }>; label: string }>;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  onSignOut: () => void;
}

const SidebarContent: React.FC<SidebarContentProps> = ({
  links, sidebarOpen, setSidebarOpen, setMobileSidebarOpen, onSignOut,
}) => {
  const { user, role } = useAuth();
  const location = useLocation();
  const { data: waqfInfo } = useWaqfInfo();
  const { getPrefetchHandler } = usePrefetchPages();
  const { data: unreadCount = 0 } = useUnreadMessages();

  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'lg:justify-center')}>
          <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center shrink-0 shadow-gold overflow-hidden">
            {waqfInfo?.waqf_logo_url ? (
              <img src={waqfInfo.waqf_logo_url} alt="شعار الوقف" className="w-full h-full object-contain rounded-xl p-0.5" />
            ) : (
              <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
            )}
          </div>
          <span className={cn('font-arabic font-bold text-lg text-sidebar-foreground truncate max-w-[150px]', !sidebarOpen && 'lg:hidden')}>
            {waqfInfo?.waqf_name || 'إدارة الوقف'}
          </span>
        </div>
        {/* Desktop toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-sidebar-foreground hover:bg-sidebar-accent hidden lg:flex"
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
        {/* Mobile close */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(false)}
          className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
       <TooltipProvider delayDuration={0}>
        {links.map((link) => {
          const isActive = location.pathname === link.to ||
            (link.to !== '/dashboard' && link.to !== '/beneficiary' && link.to !== '/waqif' &&
             location.pathname.startsWith(link.to + '/'));
          const linkContent = (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileSidebarOpen(false)}
              onMouseEnter={() => getPrefetchHandler(link.to)?.()}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                !sidebarOpen && 'lg:justify-center'
              )}
            >
              <link.icon className="w-5 h-5 shrink-0" />
              <span className={cn(!sidebarOpen && 'lg:hidden')}>{link.label}</span>
              {/* عداد الرسائل غير المقروءة */}
              {link.to.includes('/messages') && unreadCount > 0 && (
                <span className="mr-auto bg-destructive text-destructive-foreground text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );

          if (!sidebarOpen) {
            return (
              <Tooltip key={link.to} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="left" className="hidden lg:block">
                  {link.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
       </TooltipProvider>
      </nav>

      {/* User Info */}
      <div
        className="px-4 pt-4 pb-16 lg:pb-4 border-t border-sidebar-border"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className={cn('mb-3 text-sm text-sidebar-foreground/80', !sidebarOpen && 'lg:hidden')}>
          <p className="truncate">{user?.email}</p>
          <p className="text-xs text-sidebar-primary mt-1">
            {ROLE_LABELS[role || ''] || role}
          </p>
        </div>
        <TooltipProvider delayDuration={0}>
          {/* Mobile: always show button directly, no tooltip */}
          <div className="lg:hidden">
            <Button
              variant="ghost"
              className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
              onClick={onSignOut}
            >
              <LogOut className="w-5 h-5" />
              <span className="mr-2">تسجيل الخروج</span>
            </Button>
          </div>
          {/* Desktop collapsed: tooltip wraps trigger */}
          {!sidebarOpen && (
            <div className="hidden lg:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive px-0"
                    onClick={onSignOut}
                  >
                    <LogOut className="w-5 h-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">تسجيل الخروج</TooltipContent>
              </Tooltip>
            </div>
          )}
          {/* Desktop expanded: simple button */}
          {sidebarOpen && (
            <div className="hidden lg:block">
              <Button
                variant="ghost"
                className="w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
                onClick={onSignOut}
              >
                <LogOut className="w-5 h-5" />
                <span className="mr-2">تسجيل الخروج</span>
              </Button>
            </div>
          )}
        </TooltipProvider>
      </div>
    </>
  );
};

export default SidebarContent;
