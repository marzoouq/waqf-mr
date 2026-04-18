/**
 * شريط التنقل السفلي للجوال — يظهر فقط على الشاشات الصغيرة.
 * يعرض حتى 4 روابط رئيسية حسب دور المستخدم مع زر "المزيد" لفتح القائمة الجانبية.
 *
 * يطبّق `filterLinksBySectionVisibility` لإخفاء أي رابط عُطّل قسمه من
 * إعدادات الرؤية — بنفس منطق `Sidebar` (مصدر واحد للحقيقة).
 */
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useSectionsVisibility } from '@/hooks/data/settings/useSectionsVisibility';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/cn';
import { BOTTOM_NAV_LINKS } from '@/constants/bottomNavLinks';
import {
  ADMIN_ROUTE_TO_SECTION,
  BENEFICIARY_ROUTE_TO_SECTION,
} from '@/constants/navigation';
import { isActiveLink } from '@/lib/navigation/isActiveLink';
import { filterLinksBySectionVisibility } from '@/lib/permissions/filterByVisibility';

interface BottomNavProps {
  onOpenSidebar: () => void;
  unreadCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ onOpenSidebar, unreadCount = 0 }) => {
  const { role } = useAuth();
  const location = useLocation();
  const { adminSections, beneficiarySections } = useSectionsVisibility();

  const navLinks = BOTTOM_NAV_LINKS[role ?? 'beneficiary'] ?? BOTTOM_NAV_LINKS.beneficiary!;

  const isAdminLike = role === 'admin' || role === 'accountant';

  const visibleLinks = useMemo(() => {
    const routeToSection = isAdminLike ? ADMIN_ROUTE_TO_SECTION : BENEFICIARY_ROUTE_TO_SECTION;
    const visibility = isAdminLike ? adminSections : beneficiarySections;
    return filterLinksBySectionVisibility(navLinks, routeToSection, visibility);
  }, [navLinks, isAdminLike, adminSections, beneficiarySections]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/50 bg-background/95" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', willChange: 'transform' }}>
      <div className="flex items-center justify-around h-14">
        {visibleLinks.map((link) => {
          const active = isActiveLink(location.pathname, link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              aria-label={link.label}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <link.icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} aria-hidden="true" />
                {link.to.includes('/messages') && unreadCount > 0 && (
                  <span className="absolute -top-1 -left-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium leading-none">{link.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onOpenSidebar}
          aria-label="المزيد"
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-colors active:text-primary"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[11px] font-medium leading-none">المزيد</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
