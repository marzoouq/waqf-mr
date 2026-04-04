/**
 * سياق المصادقة (AuthContext)
 * 
 * تحسينات معمارية:
 * 1. قراءة الدور من JWT (app_metadata.user_role) — فوري بدون استعلام
 * 2. فصل Context إلى State + Actions لتقليل إعادة التصيير
 * 3. إزالة المؤقتات الوهمية (Safety Timeouts) و retry loops
 * 4. Fallback إلى DB فقط إذا JWT لا يحتوي الدور (تسجيل أول)
 */
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { logAccessEvent } from '@/hooks/data/audit/useAccessLog';
import { checkNewDeviceLogin } from '@/hooks/data/audit/useSecurityAlerts';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { logger } from '@/lib/logger';
import { getSafeErrorMessage } from '@/utils/safeErrorMessage';
import { fetchUserRole } from '@/lib/auth/fetchUserRole';
import { clearSlowQueries, clearPageLoadEntries } from '@/lib/monitoring';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { AuthStateContext, AuthActionsContext } from '@/hooks/auth/useAuthContext';

// إعادة تصدير للتوافقية مع الاستيراد القديم
export { useAuth, useAuthState, useAuthActions } from '@/hooks/auth/useAuthContext';

const VALID_ROLES: AppRole[] = ['admin', 'beneficiary', 'waqif', 'accountant'];

const CLEARABLE_STORAGE_KEYS = [
  'waqf_selected_fiscal_year', 'sidebar-open', 'pwa_last_seen_version',
  'waqf_theme_color', 'waqf_notification_tone', 'waqf_notification_volume',
  'waqf_notification_preferences', 'error_log_queue', 'waqf_notification_sound',
  'page_perf_entries',
] as const;

/** قراءة الدور من JWT app_metadata */
function getRoleFromSession(session: Session | null): AppRole | null {
  const metaRole = session?.user?.app_metadata?.user_role;
  if (metaRole && VALID_ROLES.includes(metaRole as AppRole)) {
    return metaRole as AppRole;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const roleRef = useRef<AppRole | null>(null);
  const lastUserIdRef = useRef<string | null>(null);

  const setRoleWithRef = useCallback((newRole: AppRole | null) => {
    roleRef.current = newRole;
    setRole(newRole);
  }, []);

  // === مستمع حالة المصادقة — موحّد بدون مؤقتات ===
  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;

        const newUserId = currentSession?.user?.id ?? null;

        // تجاهل الأحداث المتكررة لنفس المستخدم
        if (
          (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') &&
          newUserId && newUserId === lastUserIdRef.current && roleRef.current
        ) {
          logger.info('[Auth] duplicate event ignored:', event);
          return;
        }

        logger.info('[Auth] onAuthStateChange:', event);
        lastUserIdRef.current = newUserId;
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (!currentSession?.user) {
          setRoleWithRef(null);
          setLoading(false);
          return;
        }

        // === محاولة قراءة الدور من JWT (فوري) ===
        const jwtRole = getRoleFromSession(currentSession);
        if (jwtRole) {
          logger.info('[Auth] role from JWT:', jwtRole);
          setRoleWithRef(jwtRole);
          setLoading(false);

          // تسجيل الوصول + فحص الجهاز (fire-and-forget)
          logAccessEvent({
            event_type: 'role_fetch',
            user_id: currentSession.user.id,
            metadata: { role: jwtRole, source: 'jwt', status: 'success' },
          });
          checkNewDeviceLogin(currentSession.user.id, currentSession.user.email);
          return;
        }

        // === Fallback: جلب من قاعدة البيانات (تسجيل أول قبل تشغيل الـ trigger) ===
        logger.info('[Auth] role not in JWT, DB fallback');
        try {
          const result = await fetchUserRole(currentSession.user.id);
          if (!isMounted) return;

          if (result.role) {
            setRoleWithRef(result.role);
            logAccessEvent({
              event_type: 'role_fetch',
              user_id: currentSession.user.id,
              metadata: { role: result.role, source: 'db_fallback', status: 'success' },
            });
            checkNewDeviceLogin(currentSession.user.id, currentSession.user.email);
          } else {
            setRoleWithRef(null);
          }
        } catch (err) {
          logger.error('[Auth] fetchRole fallback error:', err);
          if (isMounted) setRoleWithRef(null);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    );

    // === Fallback: إذا لم يصدر INITIAL_SESSION (race condition) ===
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
      // إذا لا يزال loading ولم يتم تعيين مستخدم، فالحدث لم يصدر
      if (!lastUserIdRef.current && existingSession?.user) {
        logger.info('[Auth] getSession fallback triggered');
        const jwtRole = getRoleFromSession(existingSession);
        lastUserIdRef.current = existingSession.user.id;
        setSession(existingSession);
        setUser(existingSession.user);
        if (jwtRole) {
          setRoleWithRef(jwtRole);
        }
        setLoading(false);
      } else if (!existingSession) {
        // لا جلسة — تأكد من إيقاف التحميل
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setRoleWithRef]);

  // === إجراءات المصادقة (مراجع مستقرة) ===

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoading(false); return { error }; }

    // إجبار جلب توكن جديد يحتوي الدور بعد تعبئة app_metadata
    const jwtRole = getRoleFromSession(data?.session);
    if (!jwtRole) {
      logger.info('[Auth] role missing from JWT after signIn, refreshing session');
      await supabase.auth.refreshSession();
    }

    // onAuthStateChange يتولى إيقاف التحميل عند النجاح
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.functions.invoke('guard-signup', {
      body: { email, password },
    });
    if (error || data?.error) {
      return { error: new Error(data?.error || getSafeErrorMessage(error)) };
    }
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      logger.error('[Auth] signOut error:', err);
    } finally {
      setRoleWithRef(null);
      queryClient.clear();
      try { CLEARABLE_STORAGE_KEYS.forEach(key => localStorage.removeItem(key)); } catch {}
      try { sessionStorage.removeItem('nidLockedUntil'); } catch {}
      clearSlowQueries();
      clearPageLoadEntries();
      toast.dismiss();
    }
  }, [setRoleWithRef]);

  const refreshRole = useCallback(async () => {
    if (!user) return;
    const { role: newRole, error } = await fetchUserRole(user.id);
    if (error) {
      logger.warn('[Auth] تعذّر تحديث الدور', error);
      return;
    }
    setRoleWithRef(newRole);
  }, [user, setRoleWithRef]);

  // === Memoize contexts لمنع إعادة التصيير غير الضرورية ===
  const stateValue = useMemo(
    () => ({ user, session, role, loading }),
    [user, session, role, loading]
  );

  const actionsValue = useMemo(
    () => ({ signIn, signUp, signOut, refreshRole }),
    [signIn, signUp, signOut, refreshRole]
  );

  return (
    <AuthStateContext.Provider value={stateValue}>
      <AuthActionsContext.Provider value={actionsValue}>
        {children}
      </AuthActionsContext.Provider>
    </AuthStateContext.Provider>
  );
}
