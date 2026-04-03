/**
 * هوك إدارة حالة التخطيط العام (Sidebar + Logout + Navigation)
 * مُستخرج من DashboardLayout لفصل المسؤوليات
 */
import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useSidebarSwipe } from '@/hooks/ui/useSidebarSwipe';
import { useNavLinks } from '@/hooks/page/useNavLinks';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { SHOW_ALL_ROUTES } from '@/components/layout/constants';

const SIDEBAR_W = 256;

export function useLayoutState() {
  const { user, role, signOut } = useAuth();
  const { fiscalYearId, setFiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const location = useLocation();
  const navigate = useNavigate();
  const showAll = SHOW_ALL_ROUTES.includes(location.pathname);
  

  const links = useNavLinks();

  // ─── Sidebar State ───
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.SIDEBAR_OPEN) === 'true'; }
    catch { return false; }
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEYS.SIDEBAR_OPEN, String(sidebarOpen)); }
    catch { /* ignore */ }
  }, [sidebarOpen]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const swipe = useSidebarSwipe({
    sidebarWidth: SIDEBAR_W,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  });

  // ─── Logout ───
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

  return {
    user, role, links,
    fiscalYearId, setFiscalYearId, fiscalYear, isClosed, showAll,
    sidebarOpen, setSidebarOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
    logoutOpen, setLogoutOpen,
    swipe,
    handleSignOut, handleSignOutClick,
  };
}
