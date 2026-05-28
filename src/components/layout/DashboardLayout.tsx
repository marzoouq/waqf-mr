/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 * مُبسّط — المنطق في useLayoutState والمهلة في IdleTimeoutManager
 */
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef } from 'react';
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
import { useLayoutShell } from '@/hooks/application/useLayoutShell';

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
  } = useLayoutShell();

  const previousFocusRef = useRef<HTMLElement | null>(null);

  // accessibility — Escape للإغلاق + focus management + Tab trap دوري داخل القائمة الجوال
  useEffect(() => {
    if (!mobileSidebarOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('aside[role="dialog"][aria-label="القائمة الجانبية"]');
    const getFocusable = () => Array.from(
      dialog?.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])') ?? []
    ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);
    const focusables = getFocusable();
    focusables[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSidebarOpen(false);
        return;
      }
      if (e.key === 'Tab') {
        const items = getFocusable();
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previousFocusRef.current?.focus?.();
    };
  }, [mobileSidebarOpen, setMobileSidebarOpen]);

  return (
    <div className="min-h-screen flex w-full bg-background" dir="rtl">
      {/* Skip link — تخطي إلى المحتوى الرئيسي */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded focus:shadow-elegant"
      >
        تخطي إلى المحتوى الرئيسي
      </a>

      {/* Mobile Header */}
      <MobileHeader
        onOpenSidebar={() => setMobileSidebarOpen(true)}
        fiscalYearLabel={fiscalYear?.label}
      />


      {/* Mobile Sidebar Overlay */}
      <div
        {...swipe.overlayProps}
        aria-hidden="true"
        className={cn(
          'fixed inset-0 z-40 lg:hidden',
          mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar - Mobile (drawer dialog) */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الجانبية"
        aria-hidden={!mobileSidebarOpen}
        {...swipe.sidebarProps}
        className={cn(
          'fixed inset-y-0 right-0 z-50 flex flex-col gradient-hero shadow-elegant w-64 lg:hidden',
          !mobileSidebarOpen && 'pointer-events-none'
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
        id="main-content"
        role="main"
        aria-label="المحتوى الرئيسي"
        tabIndex={-1}
        {...swipe.mainTouchProps}
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
