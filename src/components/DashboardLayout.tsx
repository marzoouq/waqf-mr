/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 * يوفر الشريط الجانبي (قابل للطي) مع التنقل الديناميكي حسب دور المستخدم.
 * 
 * - الناظر: يرى 14 رابط (بما فيها واجهة المستفيد)
 * - المستفيد/الواقف: يرى 8 روابط
 * - الأقسام قابلة للإخفاء عبر إعدادات التطبيق (sections_visibility)
 * - يدعم الجوال مع قائمة منزلقة
 * - يتضمن رأس وتذييل للطباعة (مخفي في العرض العادي)
 */
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
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
  MessageSquare,
  Bell,
  ShieldCheck,
  BookOpen,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import WaqfInfoBar from '@/components/WaqfInfoBar';
import NotificationBell from '@/components/NotificationBell';
import { useAppSettings } from '@/hooks/useAppSettings';
import PrintHeader from '@/components/PrintHeader';
import PrintFooter from '@/components/PrintFooter';
import BetaBanner from '@/components/BetaBanner';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { Lock } from 'lucide-react';
import { defaultMenuLabels, type MenuLabels } from '@/components/settings/MenuCustomizationTab';

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
  '/beneficiary/my-share': 'share',
  '/beneficiary/financial-reports': 'reports',
};

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

// PrintHeader is now in its own file: components/PrintHeader.tsx

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
  { to: '/beneficiary/disclosure', icon: FileText, label: 'الإفصاح السنوي' },
  { to: '/beneficiary/my-share', icon: Wallet, label: 'حصتي من الريع' },
  { to: '/beneficiary/financial-reports', icon: BarChart3, label: 'التقارير المالية' },
  { to: '/beneficiary/messages', icon: MessageSquare, label: 'المراسلات' },
  { to: '/beneficiary/notifications', icon: Bell, label: 'سجل الإشعارات' },
  { to: '/beneficiary/invoices', icon: FileText, label: 'الفواتير' },
  { to: '/beneficiary/bylaws', icon: BookOpen, label: 'اللائحة التنظيمية' },
  { to: '/beneficiary/settings', icon: Settings, label: 'الإعدادات' },
];

// Routes that support "All Years" filter
const SHOW_ALL_ROUTES = [
  '/dashboard/income',
  '/dashboard/expenses',
  '/dashboard/contracts',
  '/dashboard/properties',
  '/dashboard/invoices',
  '/dashboard/audit-log',
  '/beneficiary/financial-reports',
  '/beneficiary/invoices',
  '/beneficiary/disclosure',
  '/beneficiary/my-share',
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const { fiscalYearId, setFiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const location = useLocation();
  const showAll = SHOW_ALL_ROUTES.includes(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { getJsonSetting, isLoading: settingsLoading } = useAppSettings();

  const sectionsVisibility = getJsonSetting('sections_visibility', { properties: true, contracts: true, income: true, expenses: true, beneficiaries: true, reports: true, accounts: true, users: true });
  const beneficiarySections = getJsonSetting('beneficiary_sections', { disclosure: true, share: true, accounts: true, reports: true });
  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);

  const links = useMemo(() => {
    if (role === 'admin') {
      return allAdminLinks
        .filter((link) => {
          const key = adminSectionKeys[link.to];
          return !key || sectionsVisibility[key] !== false;
        })
        .map(link => {
          const labelKey = linkLabelKeys[link.to];
          return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
        });
    }
    return allBeneficiaryLinks.filter((link) => {
      const key = beneficiarySectionKeys[link.to];
      return !key || beneficiarySections[key] !== false;
    });
  }, [role, sectionsVisibility, beneficiarySections, menuLabels]);

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
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                'w-full text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive',
                !sidebarOpen && 'lg:px-0'
              )}
            >
              <LogOut className="w-5 h-5" />
              <span className={cn('mr-2', !sidebarOpen && 'lg:hidden')}>تسجيل الخروج</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
              <AlertDialogDescription>هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2">
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90">تسجيل الخروج</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
        <div className="flex items-center gap-1">
          <Link to={role === 'admin' ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
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
        {/* Print-only Header */}
        <PrintHeader />
        <div className="hidden lg:flex items-center justify-between">
          <WaqfInfoBar />
          <div className="flex items-center gap-3 px-4 py-2">
            <FiscalYearSelector value={fiscalYearId} onChange={setFiscalYearId} showAll={showAll} />
            {isClosed && (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800 print:hidden">
                <Lock className="w-3 h-3" /> مقفلة
              </span>
            )}
            <Link to={role === 'admin' ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
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
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded-md border border-amber-200 dark:border-amber-800">
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
    </div>
  );
};

export default DashboardLayout;
