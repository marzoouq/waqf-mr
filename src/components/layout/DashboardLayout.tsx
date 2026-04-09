/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 * مُبسّط — المنطق في useLayoutState والمهلة في IdleTimeoutManager
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { cn } from '@/lib/cn';
import WaqfInfoBar from '@/components/layout/WaqfInfoBar';
const PrintHeader = lazy(() => import('@/components/common/PrintHeader'));
const PrintFooter = lazy(() => import('@/components/common/PrintFooter'));
import BetaBanner from '@/components/common/BetaBanner';
import FiscalYearSelector from '@/components/layout/FiscalYearSelector';
import SidebarContent from '@/components/layout/Sidebar';
import BottomNav from '@/components/layout/BottomNav';
const GlobalSearch = lazy(() => import('@/components/search/GlobalSearch'));
import MobileHeader from '@/components/layout/MobileHeader';
import DesktopTopBar from '@/components/layout/DesktopTopBar';
import IdleTimeoutManager from '@/components/layout/IdleTimeoutManager';
import { useLayoutState } from '@/hooks/ui/useLayoutState';

// DiagnosticOverlay — يُحمّل فقط في وضع التطوير
const DiagnosticOverlay = import.meta.env.DEV
  ? lazy(() => import('@/components/common/DiagnosticOverlay'))
  : null;

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const {
    role, links, unreadCount,
    fiscalYearId, setFiscalYearId, fiscalYear, isClosed, showAll,
    sidebarOpen, setSidebarOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
    logoutOpen, setLogoutOpen,
    swipe,
    handleSignOut, handleSignOutClick,
  } = useLayoutState();

  return (
    <div className="min-h-screen flex w-full bg-background" dir="rtl">
      {/* Mobile Header */}
      <MobileHeader
        onOpenSidebar={() => setMobileSidebarOpen(true)}
        fiscalYearLabel={fiscalYear?.label}
      />

      {/* Mobile Sidebar Overlay */}
      <div
        ref={swipe.overlayRef}
        className={cn(
          'fixed inset-0 z-45 lg:hidden',
          mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        style={{ backgroundColor: `rgba(0,0,0,${swipe.overlayOpacity})` }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar - Mobile */}
      <aside
        aria-label="القائمة الجانبية"
        ref={swipe.sidebarRef}
        onTouchStart={swipe.handleTouchStart}
        onTouchMove={swipe.handleTouchMove}
        onTouchEnd={swipe.handleTouchEnd}
        className="fixed inset-y-0 right-0 z-50 flex flex-col gradient-hero shadow-elegant w-64 lg:hidden"
        style={{ transform: `translateX(${swipe.sidebarTranslateX}px)`, willChange: 'transform' }}
      >
        <SidebarContent
          links={links}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          onSignOut={handleSignOutClick}
          unreadCount={unreadCount}
        />
      </aside>

      {/* Sidebar - Desktop */}
      <aside
        aria-label="القائمة الجانبية"
        className={cn(
          'fixed inset-y-0 right-0 z-30 hidden lg:flex flex-col gradient-hero transition-[width] duration-300 shadow-elegant',
          sidebarOpen ? 'w-64' : 'w-16'
        )}
      >
        <SidebarContent
          links={links}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          onSignOut={handleSignOutClick}
          unreadCount={unreadCount}
        />
      </aside>

      {/* Main Content */}
      <main
        role="main"
        aria-label="المحتوى الرئيسي"
        onTouchStart={swipe.handleMainTouchStart}
        onTouchMove={swipe.handleMainTouchMove}
        onTouchEnd={swipe.handleMainTouchEnd}
        className={cn(
          'flex-1 transition-[margin] duration-300 min-h-screen overflow-y-auto',
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

      <BottomNav onOpenSidebar={() => setMobileSidebarOpen(true)} unreadCount={unreadCount} />

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

      <IdleTimeoutManager />
      {DiagnosticOverlay && role === 'admin' && <Suspense fallback={null}><DiagnosticOverlay /></Suspense>}
    </div>
  );
};

export default DashboardLayout;
