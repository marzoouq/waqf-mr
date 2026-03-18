/**
 * التخطيط العام للوحة التحكم (DashboardLayout)
 * يوفر الشريط الجانبي (قابل للطي) مع التنقل الديناميكي حسب دور المستخدم.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { BookOpen, Menu, Lock, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import BottomNav from '@/components/BottomNav';
import GlobalSearch from '@/components/GlobalSearch';
import IdleTimeoutWarning from '@/components/IdleTimeoutWarning';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
import { DEFAULT_ROLE_PERMS } from '@/constants/rolePermissions';
import { logAccessEvent } from '@/hooks/useAccessLog';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import {
  linkLabelKeys, allAdminLinks, allBeneficiaryLinks,
  SHOW_ALL_ROUTES, ADMIN_ROUTE_PERM_KEYS, BENEFICIARY_ROUTE_PERM_KEYS,
  ACCOUNTANT_EXCLUDED_ROUTES, ROUTE_TITLES,
  defaultAdminSections, defaultBeneficiarySections,
  ADMIN_SECTION_KEYS, BENEFICIARY_SECTION_KEYS,
} from '@/components/dashboard-layout/constants';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

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

  useEffect(() => {
    try { localStorage.setItem('sidebar-open', String(sidebarOpen)); }
    catch { /* ignore */ }
  }, [sidebarOpen]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Fix: إغلاق القائمة الجانبية تلقائياً عند تغيير المسار
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // ─── Interactive swipe (rAF-based, no re-renders during drag) ───
  const SIDEBAR_W = 256;
  const CLOSE_THRESHOLD = 80;
  const sidebarRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const dragOffsetRef = useRef(0);
  const isDragging = useRef(false);
  const sidebarTouchStartX = useRef(0);
  const rafId = useRef(0);

  const applyTransform = useCallback((offset: number, total: number) => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.transform = `translateX(${offset}px)`;
        sidebarRef.current.style.willChange = 'transform';
      }
      if (overlayRef.current) {
        const progress = Math.max(0, 1 - offset / total);
        overlayRef.current.style.opacity = String(progress * 0.5);
        overlayRef.current.style.willChange = 'opacity';
      }
    });
  }, []);

  const clearInlineStyles = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    if (sidebarRef.current) {
      sidebarRef.current.style.transform = '';
      sidebarRef.current.style.willChange = '';
    }
    if (overlayRef.current) {
      overlayRef.current.style.opacity = '';
      overlayRef.current.style.willChange = '';
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    sidebarTouchStartX.current = e.touches[0].clientX;
    isDragging.current = true;
    dragOffsetRef.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const delta = Math.max(0, e.touches[0].clientX - sidebarTouchStartX.current);
    if (delta < 10) return; // dead zone to prevent accidental drags during taps
    dragOffsetRef.current = delta;
    applyTransform(delta, SIDEBAR_W);
  }, [applyTransform]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    clearInlineStyles();
    if (dragOffsetRef.current > CLOSE_THRESHOLD) {
      navigator.vibrate?.(15);
      setMobileSidebarOpen(false);
    }
    dragOffsetRef.current = 0;
  }, [clearInlineStyles]);

  // ─── Edge swipe-to-open from right edge (rAF-based) ───
  const edgeStartX = useRef(0);
  const edgeDragRef = useRef(0);
  const isEdgeSwiping = useRef(false);

  const handleMainTouchStart = useCallback((e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    if (x > window.innerWidth - 25 && !mobileSidebarOpen) {
      edgeStartX.current = x;
      isEdgeSwiping.current = true;
      edgeDragRef.current = 0;
    }
  }, [mobileSidebarOpen]);

  const handleMainTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isEdgeSwiping.current) return;
    const delta = Math.max(0, Math.min(SIDEBAR_W, edgeStartX.current - e.touches[0].clientX));
    edgeDragRef.current = delta;
    applyTransform(SIDEBAR_W - delta, SIDEBAR_W);
  }, [applyTransform]);

  const handleMainTouchEnd = useCallback(() => {
    if (!isEdgeSwiping.current) return;
    isEdgeSwiping.current = false;
    clearInlineStyles();
    if (edgeDragRef.current > CLOSE_THRESHOLD) {
      navigator.vibrate?.(15);
      setMobileSidebarOpen(true);
    }
    edgeDragRef.current = 0;
  }, [clearInlineStyles]);

  // Compute overlay opacity for non-dragging states
  const overlayOpacity = mobileSidebarOpen ? 0.5 : 0;

  // Compute sidebar translateX for non-dragging states
  const sidebarTranslateX = mobileSidebarOpen ? 0 : SIDEBAR_W;
  const { getJsonSetting } = useAppSettings();

  const menuLabels = getJsonSetting<MenuLabels>('menu_labels', defaultMenuLabels);

  const rolePermissions = getJsonSetting('role_permissions', DEFAULT_ROLE_PERMS);

  // إعدادات إظهار/إخفاء الأقسام — دمج المحفوظ مع الافتراضي لضمان ظهور الأقسام الجديدة
  const sectionsVisibility = { ...DEFAULT_ADMIN_SECTIONS, ...getJsonSetting<Record<string, boolean>>('sections_visibility', {}) };

  // إعدادات إظهار/إخفاء أقسام المستفيد — دمج المحفوظ مع الافتراضي
  const beneficiarySections = { ...DEFAULT_BENEFICIARY_SECTIONS, ...getJsonSetting<Record<string, boolean>>('beneficiary_sections', {}) };

  const links = useMemo(() => {
    if (role === 'admin') {
      return allAdminLinks
        .filter(link => {
          const sectionKey = ADMIN_SECTION_KEYS[link.to];
          // If the section has a visibility key, check if it's enabled
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
    return allBeneficiaryLinks
      .map(link => {
        // BUG-G1-3 fix: Replace /beneficiary home with /waqif for waqif role
        if (role === 'waqif' && link.to === '/beneficiary') {
          return { ...link, to: '/waqif' };
        }
        return link;
      })
      .filter(link => {
        // Apply beneficiary_sections visibility
        const bsKey = BENEFICIARY_SECTION_KEYS[link.to];
        if (bsKey && (beneficiarySections as Record<string, boolean>)[bsKey] === false) return false;
        const key = BENEFICIARY_ROUTE_PERM_KEYS[link.to];
        return !key || perms[key] !== false;
      });
  }, [role, rolePermissions, menuLabels, sectionsVisibility, beneficiarySections]);

  const handleSignOut = async () => {
    setMobileSidebarOpen(false);
    await logAccessEvent({ event_type: 'logout', user_id: user?.id });
    await signOut();
    navigate('/auth', { replace: true });
  };

  // ─── Idle Timeout (uses shared app_settings from useAppSettings) ───
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
      <div className="fixed top-0 right-0 left-0 z-40 flex items-center justify-between p-3 gradient-hero lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileSidebarOpen(true)}
          className="text-sidebar-foreground"
        >
          <Menu className="w-6 h-6" />
        </Button>
        <div className="flex flex-col items-center">
          <span className="font-arabic font-bold text-base text-sidebar-foreground leading-tight">{ROUTE_TITLES[location.pathname] || Object.keys(ROUTE_TITLES).filter(r => location.pathname.startsWith(r + '/')).sort((a, b) => b.length - a.length).map(r => ROUTE_TITLES[r])[0] || 'إدارة الوقف'}</span>
          {fiscalYear && (
            <span className="text-[10px] text-sidebar-foreground/70 leading-none">{fiscalYear.label}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link to={(role === 'admin' || role === 'accountant') ? '/dashboard/bylaws' : '/beneficiary/bylaws'}>
            <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent/50">
              <BookOpen className="w-5 h-5" />
            </Button>
          </Link>
          <NotificationBell />
        </div>
      </div>

      {/* Mobile Sidebar Overlay — rAF updates opacity during drag */}
      <div
        ref={overlayRef}
        className={cn(
          'fixed inset-0 z-[45] lg:hidden',
          mobileSidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
        )}
        style={{ backgroundColor: `rgba(0,0,0,${overlayOpacity})` }}
        onClick={() => setMobileSidebarOpen(false)}
      />

      {/* Sidebar - Mobile — follows finger */}
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
        {/* Print-only Header */}
        <PrintHeader />
        <div className="hidden lg:flex items-center justify-between">
          <WaqfInfoBar />
          <div className="flex items-center gap-3 px-4 py-2">
            <GlobalSearch />
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
            {/* مؤشر المستخدم والدور */}
            {user && (
              <div className="flex items-center gap-2 border-r border-border pr-3 mr-1">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium text-foreground leading-tight truncate max-w-[120px]">
                    {user.email?.split('@')[0] || 'مستخدم'}
                  </span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 leading-none">
                    {role === 'admin' ? 'ناظر' : role === 'accountant' ? 'محاسب' : role === 'beneficiary' ? 'مستفيد' : role === 'waqif' ? 'واقف' : role || '—'}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
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
        {/* Print-only Footer */}
        <PrintFooter />
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav onOpenSidebar={() => setMobileSidebarOpen(true)} />

      {/* Idle Timeout Warning */}
      {user && (
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
