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
import { logAccessEvent } from '@/lib/services/accessLogService';
import { checkNewDeviceLogin } from '@/lib/services/securityService';
import { supabase } from '@/integrations/supabase/client';
import { AppRole } from '@/types/database';
import { logger } from '@/lib/logger';
import { getSafeErrorMessage } from '@/utils/format/safeErrorMessage';
import { fetchUserRole } from '@/lib/auth/fetchUserRole';
import { clearSlowQueries, clearPageLoadEntries } from '@/lib/monitoring';
import { queryClient } from '@/lib/queryClient';
import { toast } from 'sonner';
import { AuthStateContext, AuthActionsContext } from '@/hooks/auth/useAuthContext';
import { STORAGE_KEYS } from '@/constants/storageKeys';

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

  // === مستمع حالة المصادقة — بدون await داخل الـ callback ===
  useEffect(() => {
    let isMounted = true;

    /** Fallback DB — يعمل خارج callback لتجنب قفل GoTrue */
    const fetchRoleFallback = (userId: string, email?: string | null) => {
      fetchUserRole(userId).then(result => {
        if (!isMounted) return;
        if (result.role) {
          setRoleWithRef(result.role);
          logAccessEvent({
            event_type: 'role_fetch',
            user_id: userId,
            metadata: { role: result.role, source: 'db_fallback', status: 'success' },
          });
          checkNewDeviceLogin(userId, email ?? undefined);
        } else {
          setRoleWithRef(null);
        }
        setLoading(false);
      }).catch(err => {
        logger.error('[Auth] fetchRole fallback error:', err);
        if (isMounted) {
          setRoleWithRef(null);
          setLoading(false);
        }
      });
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        // تحديثات React مباشرة — Supabase يحرر القفل قبل استدعاء الـ callback
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

        // === محاولة قراءة الدور من JWT (فوري — لا await) ===
        const jwtRole = getRoleFromSession(currentSession);
        if (jwtRole) {
          logger.info('[Auth] role from JWT:', jwtRole);
          setRoleWithRef(jwtRole);
          setLoading(false);

          // fire-and-forget
          logAccessEvent({
            event_type: 'role_fetch',
            user_id: currentSession.user.id,
            metadata: { role: jwtRole, source: 'jwt', status: 'success' },
          });
          checkNewDeviceLogin(currentSession.user.id, currentSession.user.email);
          return;
        }

        // === Fallback: fire-and-forget — لا await داخل onAuthStateChange ===
        logger.info('[Auth] role not in JWT, DB fallback');
        fetchRoleFallback(currentSession.user.id, currentSession.user.email);
      }
    );

    // === Fallback: إذا لم يصدر INITIAL_SESSION (race condition) ===
    // NOTE: getSession مسموح هنا — client-side fallback فقط. القاعدة تحظره في Edge Functions حصراً
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
          setLoading(false);
        } else {
          // لا دور في JWT — يجب جلبه من DB قبل إيقاف التحميل
          logger.info('[Auth] getSession fallback: no JWT role, fetching from DB');
          fetchRoleFallback(existingSession.user.id, existingSession.user.email);
        }
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
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error };

      // onAuthStateChange يتولى تحديث الحالة وإيقاف التحميل
      return { error: null };
    } catch (err) {
      logger.warn('[Auth] signIn unexpected error:', err);
      return { error: err instanceof Error ? err : new Error('حدث خطأ غير متوقع أثناء تسجيل الدخول') };
    }
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
      try { sessionStorage.removeItem(STORAGE_KEYS.NID_LOCKED_UNTIL); } catch {}
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
