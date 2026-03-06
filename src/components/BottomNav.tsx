/**
 * شريط التنقل السفلي للجوال — يظهر فقط على الشاشات الصغيرة.
 * يعرض 5 روابط رئيسية حسب دور المستخدم مع زر "المزيد" لفتح القائمة الجانبية.
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Building2, FileText, Wallet, Menu, ClipboardList, Receipt, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onOpenSidebar: () => void;
}

const adminLinks = [
  { to: '/dashboard', icon: Home, label: 'الرئيسية' },
  { to: '/dashboard/properties', icon: Building2, label: 'العقارات' },
  { to: '/dashboard/contracts', icon: FileText, label: 'العقود' },
  { to: '/dashboard/accounts', icon: Wallet, label: 'الحسابات' },
];

const accountantLinks = [
  { to: '/dashboard', icon: Home, label: 'الرئيسية' },
  { to: '/dashboard/income', icon: TrendingUp, label: 'الدخل' },
  { to: '/dashboard/expenses', icon: TrendingDown, label: 'المصروفات' },
  { to: '/dashboard/invoices', icon: Receipt, label: 'الفواتير' },
];

const beneficiaryLinks = [
  { to: '/beneficiary', icon: Home, label: 'الرئيسية' },
  { to: '/beneficiary/my-share', icon: Wallet, label: 'حصتي' },
  { to: '/beneficiary/disclosure', icon: ClipboardList, label: 'الإفصاح' },
  { to: '/beneficiary/invoices', icon: Receipt, label: 'الفواتير' },
];

const waqifLinks = [
  { to: '/beneficiary', icon: Home, label: 'الرئيسية' },
  { to: '/beneficiary/properties', icon: Building2, label: 'العقارات' },
  { to: '/beneficiary/contracts', icon: FileText, label: 'العقود' },
  { to: '/beneficiary/accounts', icon: Wallet, label: 'الحسابات' },
];

const BottomNav: React.FC<BottomNavProps> = ({ onOpenSidebar }) => {
  const { role } = useAuth();
  const location = useLocation();

  const navLinks = role === 'admin'
    ? adminLinks
    : role === 'accountant'
      ? accountantLinks
      : role === 'waqif'
        ? waqifLinks
        : beneficiaryLinks;

  const isActive = (to: string) =>
    location.pathname === to ||
    (to !== '/dashboard' && to !== '/beneficiary' && location.pathname.startsWith(to + '/'));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-border/50 bg-background/80 backdrop-blur-lg" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="flex items-center justify-around h-14">
        {navLinks.map((link) => {
          const active = isActive(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              <link.icon className={cn('w-5 h-5', active && 'stroke-[2.5]')} />
              <span className="text-[10px] font-medium leading-none">{link.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onOpenSidebar}
          className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full text-muted-foreground transition-colors active:text-primary"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] font-medium leading-none">المزيد</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
