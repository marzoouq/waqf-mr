/**
 * SidebarNavList — قائمة روابط التنقل المجمّعة (presentational)
 */
import { Link, useLocation } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import { isActiveLink } from '@/lib/navigation/isActiveLink';
import { usePrefetchPages } from '@/hooks/data/core/usePrefetchPages';

export type NavLinkItem = { to: string; icon: React.ComponentType<{ className?: string }>; label: string };
export type NavGroupItem = { key: string; label: string | null; items: NavLinkItem[] };

interface SidebarNavListProps {
  links: NavLinkItem[] & { groups?: NavGroupItem[] };
  sidebarOpen: boolean;
  setMobileSidebarOpen: (v: boolean) => void;
  unreadCount?: number;
}

export const SidebarNavList: React.FC<SidebarNavListProps> = ({
  links, sidebarOpen, setMobileSidebarOpen, unreadCount = 0,
}) => {
  const location = useLocation();
  const { getPrefetchHandler } = usePrefetchPages();

  const groups: NavGroupItem[] = links.groups && links.groups.length
    ? links.groups
    : [{ key: '_flat', label: null, items: links }];

  const renderLink = (link: NavLinkItem) => {
    const isActive = isActiveLink(location.pathname, link.to);
    const linkContent = (
      <Link
        key={link.to}
        to={link.to}
        aria-label={link.label}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => setMobileSidebarOpen(false)}
        onMouseEnter={() => getPrefetchHandler(link.to)?.()}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-lg transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
          isActive
            ? 'bg-sidebar-accent text-sidebar-primary'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
          !sidebarOpen && 'lg:justify-center'
        )}
      >
        <link.icon className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span className={cn(!sidebarOpen && 'lg:hidden')}>{link.label}</span>
        {link.to.includes('/messages') && unreadCount > 0 && (
          <>
            <span className="sr-only"> — {unreadCount} رسالة غير مقروءة</span>
            <span aria-hidden="true" className="ms-auto bg-destructive text-destructive-foreground text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          </>
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
  };

  return (
    <nav aria-label="القائمة الرئيسية" className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
      <TooltipProvider delayDuration={0}>
        {groups.map((group, idx) => (
          <div key={group.key} className={cn(idx > 0 && 'mt-3 pt-2 border-t border-sidebar-border/40')}>
            {group.label && sidebarOpen && (
              <p className="px-3 pt-1 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map(renderLink)}
            </div>
          </div>
        ))}
      </TooltipProvider>
    </nav>
  );
};

