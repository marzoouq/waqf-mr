import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Building2,
  Home,
  FileText,
  Wallet,
  Users,
  BarChart3,
  LogOut,
  Menu,
  X,
  DollarSign,
  Receipt,
  ChevronLeft,
  UserCog,
  Eye,
  Settings,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import WaqfInfoBar from '@/components/WaqfInfoBar';
import NotificationBell from '@/components/NotificationBell';
import { useAppSettings } from '@/hooks/useAppSettings';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Map route segments to settings keys
const adminSectionKeys: Record<string, string> = {
  '/dashboard/properties': 'properties',
  '/dashboard/contracts': 'contracts',
  '/dashboard/income': 'income',
  '/dashboard/expenses': 'expenses',
  '/dashboard/beneficiaries': 'beneficiaries',
  '/dashboard/reports': 'reports',
  '/dashboard/accounts': 'accounts',
  '/dashboard/users': 'users',
};

const beneficiarySectionKeys: Record<string, string> = {
  '/beneficiary/disclosure': 'disclosure',
  '/beneficiary/share': 'share',
  '/beneficiary/accounts': 'accounts',
  '/beneficiary/reports': 'reports',
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { getJsonSetting, isLoading: settingsLoading } = useAppSettings();

  const allAdminLinks = [
    { to: '/dashboard', icon: Home, label: 'الرئيسية' },
    { to: '/dashboard/properties', icon: Building2, label: 'العقارات' },
    { to: '/dashboard/contracts', icon: FileText, label: 'العقود' },
    { to: '/dashboard/income', icon: DollarSign, label: 'الدخل' },
    { to: '/dashboard/expenses', icon: Receipt, label: 'المصروفات' },
    { to: '/dashboard/beneficiaries', icon: Users, label: 'المستفيدين' },
    { to: '/dashboard/reports', icon: BarChart3, label: 'التقارير' },
    { to: '/dashboard/accounts', icon: Wallet, label: 'الحسابات' },
    { to: '/dashboard/users', icon: UserCog, label: 'إدارة المستخدمين' },
    { to: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
    { to: '/beneficiary', icon: Eye, label: 'واجهة المستفيد' },
  ];

  const allBeneficiaryLinks = [
    { to: '/beneficiary', icon: Home, label: 'الرئيسية' },
    { to: '/beneficiary/disclosure', icon: FileText, label: 'الإفصاح السنوي' },
    { to: '/beneficiary/share', icon: Wallet, label: 'حصتي من الريع' },
    { to: '/beneficiary/accounts', icon: Receipt, label: 'الحسابات الختامية' },
    { to: '/beneficiary/reports', icon: BarChart3, label: 'التقارير المالية' },
  ];

  const sectionsVisibility = getJsonSetting('sections_visibility', { properties: true, contracts: true, income: true, expenses: true, beneficiaries: true, reports: true, accounts: true, users: true });
  const beneficiarySections = getJsonSetting('beneficiary_sections', { disclosure: true, share: true, accounts: true, reports: true });

  const links = useMemo(() => {
    if (role === 'admin') {
      return allAdminLinks.filter((link) => {
        const key = adminSectionKeys[link.to];
        return !key || sectionsVisibility[key] !== false;
      });
    }
    return allBeneficiaryLinks.filter((link) => {
      const key = beneficiarySectionKeys[link.to];
      return !key || beneficiarySections[key] !== false;
    });
  }, [role, sectionsVisibility, beneficiarySections]);

  const handleSignOut = async () => {
    await signOut();
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        <div className={cn('flex items-center gap-3', !sidebarOpen && 'lg:justify-center')}>
          <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center flex-shrink-0 shadow-gold">
            <Building2 className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <span className={cn('font-display font-bold text-lg text-sidebar-foreground', !sidebarOpen && 'lg:hidden')}>إدارة الوقف</span>
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
        {links.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileSidebarOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-primary'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                !sidebarOpen && 'lg:justify-center'
              )}
            >
              <link.icon className="w-5 h-5 flex-shrink-0" />
              <span className={cn(!sidebarOpen && 'lg:hidden')}>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn('mb-3 text-sm text-sidebar-foreground/80', !sidebarOpen && 'lg:hidden')}>
          <p className="truncate">{user?.email}</p>
          <p className="text-xs text-sidebar-primary mt-1">
            {role === 'admin' ? 'ناظر الوقف' : role === 'beneficiary' ? 'مستفيد' : 'واقف'}
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={handleSignOut}
          className={cn(
            'w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
            !sidebarOpen && 'lg:px-0'
          )}
        >
          <LogOut className="w-5 h-5" />
          <span className={cn('mr-2', !sidebarOpen && 'lg:hidden')}>تسجيل الخروج</span>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile Header */}
      <div className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between p-3 gradient-hero lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
          className="text-sidebar-foreground"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <span className="font-display font-bold text-lg text-sidebar-foreground">إدارة الوقف</span>
        <NotificationBell />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col gradient-hero shadow-elegant w-64 transition-transform duration-300 lg:hidden',
          mobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-30 hidden lg:flex flex-col gradient-hero transition-all duration-300 shadow-elegant',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 transition-all duration-300 min-h-screen overflow-y-auto',
        'pt-14 lg:pt-0',
        sidebarOpen ? 'lg:mr-64' : 'lg:mr-16'
      )}>
        <div className="hidden lg:flex items-center justify-between">
          <WaqfInfoBar />
          <div className="px-4 py-2">
            <NotificationBell />
          </div>
        </div>
        <div className="lg:hidden">
          <WaqfInfoBar />
        </div>
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
