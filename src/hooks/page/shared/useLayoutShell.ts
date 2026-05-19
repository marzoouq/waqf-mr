/**
 * هوك إدارة حالة التخطيط العام (Sidebar + Logout dialog + Navigation)
 * UI-only — منطق تسجيل الخروج مستخرج إلى useLogoutFlow
 */
import { useState, useEffect, useCallback } from 'react';
import { safeGet, safeSet } from '@/lib/storage';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/auth/useAuthContext';
import { useLogoutFlow } from '@/hooks/auth/useLogoutFlow';
import { useFiscalYear } from '@/contexts/FiscalYearContext';
import { useSidebarSwipe } from '@/hooks/ui/useSidebarSwipe';
import { useNavLinks } from '@/hooks/page/shared/useNavLinks';
import { useUnreadMessages } from '@/hooks/data/messaging/useUnreadMessages';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { SHOW_ALL_ROUTES } from '@/constants/navigation';

const SIDEBAR_W = 256;

export function useLayoutState() {
  const { user, role } = useAuth();
  const { fiscalYearId, setFiscalYearId, fiscalYear, isClosed } = useFiscalYear();
  const location = useLocation();
  const showAll = SHOW_ALL_ROUTES.includes(location.pathname);

  const links = useNavLinks();
  const { performLogout } = useLogoutFlow();

  // ─── Sidebar State ───
  const [sidebarOpen, setSidebarOpen] = useState(() => safeGet<string>(STORAGE_KEYS.SIDEBAR_OPEN, 'false') === 'true');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    safeSet(STORAGE_KEYS.SIDEBAR_OPEN, String(sidebarOpen));
  }, [sidebarOpen]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- close mobile sidebar on route change
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  const swipe = useSidebarSwipe({
    sidebarWidth: SIDEBAR_W,
    mobileSidebarOpen,
    setMobileSidebarOpen,
  });

  // ─── Logout (UI orchestration only) ───
  const handleSignOut = useCallback(async () => {
    setLogoutOpen(false);
    setMobileSidebarOpen(false);
    await performLogout();
  }, [performLogout]);

  const handleSignOutClick = useCallback(() => {
    setLogoutOpen(true);
  }, []);

  // ─── Unread messages ───
  const { data: unreadCount = 0 } = useUnreadMessages();

  return {
    user, role, links, unreadCount,
    fiscalYearId, setFiscalYearId, fiscalYear, isClosed, showAll,
    sidebarOpen, setSidebarOpen,
    mobileSidebarOpen, setMobileSidebarOpen,
    logoutOpen, setLogoutOpen,
    swipe,
    handleSignOut, handleSignOutClick,
  };
}
