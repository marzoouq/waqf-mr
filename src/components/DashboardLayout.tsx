/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock } from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import WaqfInfoBar from '@/components/WaqfInfoBar';
import { useAppSettings } from '@/hooks/page/useAppSettings';
import PrintHeader from '@/components/PrintHeader';
import PrintFooter from '@/components/PrintFooter';
import BetaBanner from '@/components/BetaBanner';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { defaultMenuLabels, type MenuLabels } from '@/components/settings/MenuCustomizationTab';
import SidebarContent from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import GlobalSearch from '@/components/GlobalSearch';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';
import { useIdleTimeout } from '@/hooks/ui/useIdleTimeout';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import { logAccessEvent } from '@/hooks/data/useAccessLog';
import { useRealtimeAlerts } from '@/hooks/data/useRealtimeAlerts';
import { useSidebarSwipe } from '@/hooks/ui/useSidebarSwipe';
import {
  linkLabelKeys, allAdminLinks, allBeneficiaryLinks,
  SHOW_ALL_ROUTES, ADMIN_ROUTE_PERM_KEYS, BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES,
  defaultAdminSections, defaultBeneficiarySections,
  ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS,
} from '@/components/dashboard-layout/constants';
import MobileHeader from '@/components/dashboard-layout/MobileHeader';
import DesktopTopBar from '@/components/dashboard-layout/DesktopTopBar';

// DiagnosticOverlay — يُحمّل فقط في وضع التطوير
const DiagnosticOverlay = import.meta.env.DEV
  ? (await import('@/components/DiagnosticOverlay')).default
  : null;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const SIDEBAR_W = 256;

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, role, signOut } = useAuth();
  const { fiscalYearId, setFiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const location = useLocation();
  const navigate = useNavigate();
  const showAll = SHOW_ALL_ROUTES.includes(location.pathname);
  useRealtimeAlerts(navigate);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem('sidebar-open') === 'true'; }
    catch { return false; }
  });
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem('sidebar-open', String(sidebarOpen)); }
    catch { /* ignore */ }
  }, [sidebarOpen]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const {
    sidebarRef, overlayRef,
    handleTouchStart, handleTouchMove, handleTouchEnd,
    handleMainTouchStart, handleMainTouchMove, handleMainTouchEnd,
    overlayOpacity, sidebarTranslateX,
  } = useSidebarSwipe({
    sidebarWidth: SIDEBAR_W,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  });

  const { getJsonSetting } = useAppSettings();

  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);
  const rolePermissions = getJsonSetting('role_permissions', DEFAULT_ROLE_PERMS);
  const sectionsVisibility = useMemo(() => ({ ...defaultAdminSections, ...getJsonSetting<Record<string, boolean>>('sections_visibility', {}) }), [getJsonSetting]);
  const beneficiarySections = useMemo(() => ({ ...defaultBeneficiarySections, ...getJsonSetting<Record<string, boolean>>('beneficiary_sections', {}) }), [getJsonSetting]);

  const links = useMemo(() => {
    if (role === 'admin') {
      return allAdminLinks
        .filter(link => {
          const sectionKey = ADMIN_SECTION_KEYS[link.to];
          return !sectionKey || (sectionsVisibility as Record<string, boolean>)[sectionKey] !== false;
        })
        .map(link => {
          const labelKey = linkLabelKeys[link.to];
          return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
        });
    }

    if (role === 'accountant') {
      const perms = rolePermissions.accountant || DEFAULT_ROLE_PERMS.accountant;
      return allAdminLinks
        .filter(link => !ACCOUNTANT_EXCLUDED_ROUTES.includes(link.to))
        .filter(link => {
          const sectionKey = ADMIN_SECTION_KEYS[link.to];
          if (sectionKey && (sectionsVisibility as Record<string, boolean>)[sectionKey] === false) return false;
          const key = ADMIN_ROUTE_PERM_KEYS[link.to];
          return !key || perms?.[key] !== false;
        })
        .map(link => {
          const labelKey = linkLabelKeys[link.to];
          return { ...link, label: (labelKey && menuLabels[labelKey]) || link.label };
        });
    }

    const roleKey = role === 'waqif' ? 'waqif' : 'beneficiary';
    const perms = rolePermissions[roleKey] || DEFAULT_ROLE_PERMS[roleKey] || {};
    return allBeneficiaryLinks
      .map(link => {
        if (role === 'waqif' && link.to === '/beneficiary') {
          return { ...link, to: '/waqif' };
        }
        return link;
      })
      .filter(link => {
        const bsKey = BENEFICIARY_SECTION_KEYS[link.to];
        if (bsKey && (beneficiarySections as Record<string, boolean>)[bsKey] === false) return false;
        const key = BENEFICIARY_ROUTE_PERM_KEYS[link.to];
        return !key || perms[key] !== false;
      });
  }, [role, rolePermissions, menuLabels, sectionsVisibility, beneficiarySections]);

  const handleSignOut = useCallback(async () => {
    setLogoutOpen(false);
    setMobileSidebarOpen(false);
    await logAccessEvent({ event_type: 'logout', user_id: user?.id });
    await signOut();
    navigate('/auth', { replace: true });
  }, [navigate, signOut, user?.id]);

  const handleSignOutClick = useCallback(() => {
    setLogoutOpen(true);
  }, []);

  // ─── Idle Timeout ───
  const idleMinutesRaw = getJsonSetting<number>('idle_timeout_minutes', 15);
  const safeIdleMinutes = Math.max(1, Math.min(120, idleMinutesRaw ?? 15));
  const timeoutMs = safeIdleMinutes * 60 * 1000;

  const handleIdleLogout = useCallback(async () => {
    await logAccessEvent({ event_type: 'idle_logout', user_id: user?.id });
    await signOut();
    window.location.href = '/auth?reason=idle';
  }, [signOut, user?.id]);

  const { showWarning, remaining, stayActive } = useIdleTimeout({
    timeout: timeoutMs,
    warningBefore: 60 * 1000,
    onIdle: handleIdleLogout,
  });

  return (
    <div className="min-h-screen flex w-full bg-background">
      {/* Mobile Header */}
      <MobileHeader
        onOpenSidebar={() => setMobileSidebarOpen(true)}
        fiscalYearLabel={fiscalYear?.label}
      />

      {/* Mobile Sidebar Overlay */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 z-45 lg:hidden',
          mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar - Mobile */}
      <aside
        ref={sidebarRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="fixed inset-y-0 right-0 z-50 flex flex-col gradient-hero shadow-elegant w-64 lg:hidden transition-transform duration-300"
        style={{ transform: `translateX(${sidebarTranslateX}px)` }}
      >
        <SidebarContent
          links={links}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          onSignOut={handleSignOutClick}
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
          onSignOut={handleSignOutClick}
        />
      </aside>

      {/* Main Content */}
      <main
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
        className={cn(
          'flex-1 transition-all duration-300 min-h-screen overflow-y-auto',
          'pt-14 pb-16 lg:pt-0 lg:pb-0',
          sidebarOpen ? 'lg:mr-64' : 'lg:mr-16'
        )}
      >
        <PrintHeader />
        <DesktopTopBar
          fiscalYearId={fiscalYearId}
          onFiscalYearChange={setFiscalYearId}
          showAll={showAll}
          isClosed={isClosed}
        />
        <div className="lg:hidden">
          <WaqfInfoBar />
          <div className="flex items-center gap-2 px-3 py-1.5 print:hidden flex-wrap">
            <FiscalYearSelector value={fiscalYearId} onChange={setFiscalYearId} showAll={showAll} />
            {isClosed && (
               <span className="text-xs text-warning dark:text-warning font-medium flex items-center gap-1 bg-warning/10 px-2 py-1 rounded-md border border-warning/30">
                <Lock className="w-3 h-3" /> مقفلة
              </span>
            )}
            <GlobalSearch />
          </div>
        </div>
        {(role === 'admin' || role === 'accountant') && <BetaBanner />}
        {children}
        <PrintFooter />
      </main>

      <BottomNav onOpenSidebar={() => setMobileSidebarOpen(true)} />

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من رغبتك في تسجيل الخروج من النظام؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90">
              تسجيل الخروج
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {user && (
        <IdleTimeoutWarning
          open={showWarning}
          remaining={remaining}
          onStayActive={stayActive}
        />
      )}
      {DiagnosticOverlay && role === 'admin' && <DiagnosticOverlay />}
    </div>
  );
};

export default DashboardLayout;
