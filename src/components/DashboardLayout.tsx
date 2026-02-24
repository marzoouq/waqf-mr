/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 * يوفر الشريط الجانبي (قابل للطي) مع التنقل الديناميكي حسب دور المستخدم.
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Building2, Home, FileText, Wallet, Users, BarChart3,
  DollarSign, Receipt, UserCog, Eye, Settings, MessageSquare,
  Bell, ShieldCheck, BookOpen, Menu, Lock,
} from 'lucide-react';
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import WaqfInfoBar from '@/components/WaqfInfoBar';
import NotificationBell from '@/components/NotificationBell';
import { useAppSettings } from '@/hooks/useAppSettings';
import PrintHeader from '@/components/PrintHeader';
import PrintFooter from '@/components/PrintFooter';
import BetaBanner from '@/components/BetaBanner';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { defaultMenuLabels, type MenuLabels } from '@/components/settings/MenuCustomizationTab';
import SidebarContent from '@/components/Sidebar';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// Map link keys to menu_labels keys
const linkLabelKeys: Record<string, keyof MenuLabels> = {
  '/dashboard': 'home',
  '/dashboard/properties': 'properties',
  '/dashboard/contracts': 'contracts',
  '/dashboard/income': 'income',
  '/dashboard/expenses': 'expenses',
  '/dashboard/beneficiaries': 'beneficiaries',
  '/dashboard/reports': 'reports',
  '/dashboard/accounts': 'accounts',
  '/dashboard/users': 'users',
  '/dashboard/settings': 'settings',
  '/dashboard/messages': 'messages',
  '/dashboard/invoices': 'invoices',
  '/dashboard/audit-log': 'audit_log',
  '/dashboard/bylaws': 'bylaws',
  '/beneficiary': 'beneficiary_view',
};

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
  { to: '/dashboard/messages', icon: MessageSquare, label: 'المراسلات' },
  { to: '/dashboard/invoices', icon: FileText, label: 'الفواتير' },
  { to: '/dashboard/audit-log', icon: ShieldCheck, label: 'سجل المراجعة' },
  { to: '/dashboard/bylaws', icon: BookOpen, label: 'اللائحة التنظيمية' },
  { to: '/beneficiary', icon: Eye, label: 'واجهة المستفيد' },
];

const allBeneficiaryLinks = [
  { to: '/beneficiary', icon: Home, label: 'الرئيسية' },
  { to: '/beneficiary/properties', icon: Building2, label: 'العقارات' },
  { to: '/beneficiary/contracts', icon: FileText, label: 'العقود' },
  { to: '/beneficiary/disclosure', icon: FileText, label: 'الإفصاح السنوي' },
  { to: '/beneficiary/my-share', icon: Wallet, label: 'حصتي من الريع' },
  { to: '/beneficiary/financial-reports', icon: BarChart3, label: 'التقارير المالية' },
  { to: '/beneficiary/accounts', icon: Wallet, label: 'الحسابات الختامية' },
  { to: '/beneficiary/messages', icon: MessageSquare, label: 'المراسلات' },
  { to: '/beneficiary/notifications', icon: Bell, label: 'سجل الإشعارات' },
  { to: '/beneficiary/invoices', icon: FileText, label: 'الفواتير' },
  { to: '/beneficiary/bylaws', icon: BookOpen, label: 'اللائحة التنظيمية' },
  { to: '/beneficiary/settings', icon: Settings, label: 'الإعدادات' },
];

// Routes that support "All Years" filter (beneficiary routes excluded to enforce published-year restriction)
const SHOW_ALL_ROUTES = [
  '/dashboard/income',
  '/dashboard/expenses',
  '/dashboard/contracts',
  '/dashboard/properties',
  '/dashboard/invoices',
  '/dashboard/audit-log',
];

const DEFAULT_ROLE_PERMS: Record<string, Record<string, boolean>> = {
  accountant: {
    properties: true, contracts: true, income: true, expenses: true,
    beneficiaries: true, reports: true, accounts: true, invoices: true,
    bylaws: true, messages: true, audit_log: true,
  },
  beneficiary: {
    properties: true, contracts: true, disclosure: true, share: true,
    reports: true, accounts: true, invoices: true, bylaws: true, messages: true,
  },
  waqif: {
    properties: true, contracts: true, disclosure: false,
    reports: true, accounts: true, bylaws: true,
    share: false,
  },
};

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, session, role, signOut } = useAuth();
  const { fiscalYearId, setFiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const location = useLocation();
  const showAll = SHOW_ALL_ROUTES.includes(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { getJsonSetting } = useAppSettings();

  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);

  const rolePermissions = getJsonSetting('role_permissions', DEFAULT_ROLE_PERMS);

  // Map admin routes to permission keys
  const adminRoutePermKeys: Record<string, string> = {
    '/dashboard/properties': 'properties',
    '/dashboard/contracts': 'contracts',
    '/dashboard/income': 'income',
    '/dashboard/expenses': 'expenses',
    '/dashboard/beneficiaries': 'beneficiaries',
    '/dashboard/reports': 'reports',
    '/dashboard/accounts': 'accounts',
    '/dashboard/invoices': 'invoices',
    '/dashboard/bylaws': 'bylaws',
    '/dashboard/messages': 'messages',
    '/dashboard/audit-log': 'audit_log',
  };

  // Map beneficiary routes to permission keys
  const beneficiaryRoutePermKeys: Record<string, string> = {
    '/beneficiary/properties': 'properties',
    '/beneficiary/contracts': 'contracts',
    '/beneficiary/disclosure': 'disclosure',
    '/beneficiary/my-share': 'share',
    '/beneficiary/financial-reports': 'reports',
    '/beneficiary/accounts': 'accounts',
    '/beneficiary/invoices': 'invoices',
    '/beneficiary/bylaws': 'bylaws',
    '/beneficiary/messages': 'messages',
  };

  // Routes accountant can never access
  const accountantExcludedRoutes = ['/dashboard/users', '/dashboard/settings'];

  const links = useMemo(() => {
    if (role === 'admin') {
      return allAdminLinks.map(link => {
        const labelKey = linkLabelKeys[link.to];
        return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
      });
    }

    if (role === 'accountant') {
      const perms = rolePermissions.accountant || DEFAULT_ROLE_PERMS.accountant;
      return allAdminLinks
        .filter(link => !accountantExcludedRoutes.includes(link.to))
        .filter(link => {
          const key = adminRoutePermKeys[link.to];
          return !key || perms[key] !== false;
        })
        .map(link => {
          const labelKey = linkLabelKeys[link.to];
          return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
        });
    }

    // beneficiary or waqif
    const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
    const perms = rolePermissions[roleKey] || DEFAULT_ROLE_PERMS[roleKey] || {};
    return allBeneficiaryLinks.filter(link => {
      const key = beneficiaryRoutePermKeys[link.to];
      return !key || perms[key] !== false;
    });
  }, [role, rolePermissions, menuLabels]);

  const handleSignOut = async () => {
    await signOut();
  };

  // ─── Idle Timeout (moved from AuthContext) ───
  const { data: idleMinutes } = useQuery({
    queryKey: ['idle-timeout-setting'],
    queryFn: async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'idle_timeout_minutes').maybeSingle();
      return data?.value ? parseInt(data.value, 10) : 15;
    },
    staleTime: 1000 * 60 * 5,
  });

  const timeoutMs = (idleMinutes ?? 15) * 60 * 1000;

  const handleIdleLogout = useCallback(async () => {
    await signOut();
    window.location.href = '/auth?reason=idle';
  }, [signOut]);

  const { showWarning, remaining, stayActive } = useIdleTimeout({
    timeout: timeoutMs,
    warningBefore: 60 * 1000,
    onIdle: handleIdleLogout,
  });

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
        <div className="flex items-center gap-1">
          <Link to={(role === 'admin' || role === 'accountant') ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
              <BookOpen className="w-5 h-5" />
            </Button>
          </Link>
          <NotificationBell />
        </div>
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
        <SidebarContent
          links={links}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-30 hidden lg:flex flex-col gradient-hero transition-all duration-300 shadow-elegant',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <SidebarContent
          links={links}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          onSignOut={handleSignOut}
        />
      </aside>

      {/* Main Content */}
      <main className={cn(
        'flex-1 transition-all duration-300 min-h-screen overflow-y-auto',
        'pt-14 lg:pt-0',
        sidebarOpen ? 'lg:mr-64' : 'lg:mr-16'
      )}>
        {/* Print-only Header */}
        <PrintHeader />
        <div className="hidden lg:flex items-center justify-between">
          <WaqfInfoBar />
          <div className="flex items-center gap-3 px-4 py-2">
            <FiscalYearSelector value={fiscalYearId} onChange={setFiscalYearId} showAll={showAll} />
            {isClosed && (
              <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-md border border-warning/30 print:hidden">
                <Lock className="w-3 h-3" /> مقفلة
              </span>
            )}
            <Link to={(role === 'admin' || role === 'accountant') ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
              <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
                <BookOpen className="w-5 h-5" />
              </Button>
            </Link>
            <NotificationBell />
          </div>
        </div>
        <div className="lg:hidden">
          <WaqfInfoBar />
          <div className="flex items-center gap-2 px-3 py-1.5 print:hidden">
            <FiscalYearSelector value={fiscalYearId} onChange={setFiscalYearId} showAll={showAll} />
            {isClosed && (
               <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-md border border-warning/30">
                <Lock className="w-3 h-3" /> مقفلة
              </span>
            )}
          </div>
        </div>
        <BetaBanner />
        {children}
        {/* Print-only Footer */}
        <PrintFooter />
      </main>

      {/* Idle Timeout Warning */}
      {session && (
        <IdleTimeoutWarning
          open={showWarning}
          remaining={remaining}
          onStayActive={stayActive}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
