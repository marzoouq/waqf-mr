/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 */
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock } from 'lucide-react';
import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import WaqfInfoBar from '@/components/layout/WaqfInfoBar';
import { useAppSettings } from '@/hooks/page/useAppSettings';
const PrintHeader = lazy(() => import('@/components/common/PrintHeader'));
const PrintFooter = lazy(() => import('@/components/common/PrintFooter'));
import BetaBanner from '@/components/common/BetaBanner';
import FiscalYearSelector from '@/components/layout/FiscalYearSelector';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import SidebarContent from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
const GlobalSearch = lazy(() => import('@/components/search/GlobalSearch'));
const IdleTimeoutWarning = lazy(() => import('@/components/auth/IdleTimeoutWarning'));
import { useIdleTimeout } from '@/hooks/ui/useIdleTimeout';
import { logAccessEvent } from '@/hooks/data/useAccessLog';
import { useRealtimeAlerts } from '@/hooks/data/useRealtimeAlerts';
import { useSidebarSwipe } from '@/hooks/ui/useSidebarSwipe';
import { SHOW_ALL_ROUTES } from '@/components/dashboard-layout/constants';
import MobileHeader from '@/components/dashboard-layout/MobileHeader';
import DesktopTopBar from '@/components/dashboard-layout/DesktopTopBar';
import { useNavLinks } from '@/hooks/page/useNavLinks';

// DiagnosticOverlay — يُحمّل فقط في وضع التطوير
const DiagnosticOverlay = import.meta.env.DEV
  ? lazy(() => import('@/components/common/DiagnosticOverlay'))
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

  // روابط القائمة الجانبية — مُستخرجة إلى hook مستقل
  const links = useNavLinks();

  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN) === 'true'; }
    catch { return false; }
  });
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(sidebarOpen)); }
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
    <div className="min-h-screen flex w-full bg-background" dir="rtl">
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
        aria-label="القائمة الجانبية"
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
        aria-label="القائمة الجانبية"
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
        role="main"
        aria-label="المحتوى الرئيسي"
        onTouchStart={handleMainTouchStart}
        onTouchMove={handleMainTouchMove}
        onTouchEnd={handleMainTouchEnd}
        className={cn(
          'flex-1 transition-all duration-300 min-h-screen overflow-y-auto',
          'pt-14 pb-16 lg:pt-0 lg:pb-0',
          sidebarOpen ? 'lg:mr-64' : 'lg:mr-16'
        )}
      >
        <Suspense fallback={null}><PrintHeader /></Suspense>
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
            <Suspense fallback={null}><GlobalSearch /></Suspense>
          </div>
        </div>
        {(role === 'admin' || role === 'accountant') && <BetaBanner />}
        {children}
        <Suspense fallback={null}><PrintFooter /></Suspense>
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
        <Suspense fallback={null}>
          <IdleTimeoutWarning
            open={showWarning}
            remaining={remaining}
            onStayActive={stayActive}
          />
        </Suspense>
      )}
      {DiagnosticOverlay && role === 'admin' && <Suspense fallback={null}><DiagnosticOverlay /></Suspense>}
    </div>
  );
};

export default DashboardLayout;
