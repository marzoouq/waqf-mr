/**
 * useAuthListener — مستمع حالة المصادقة (مُستخرج من AuthContext في الموجة 18)
 *
 * يُغلِّف:
 * - subscription على onAuthStateChange
 * - getSession fallback لحالة عدم إصدار INITIAL_SESSION
 * - قراءة الدور من JWT app_metadata أو DB fallback
 * - logging + تنبيه الجهاز الجديد
 *
 * يُرجع: { user, session, role, loading } كحالة مُدارة.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';
import { logAccessEvent } from '@/lib/services/accessLogService';
import { checkNewDeviceLogin } from '@/lib/services/securityService';
import { fetchUserRole } from '@/lib/auth/fetchUserRole';
import type { AppRole } from '@/types/database';

const VALID_ROLES: AppRole[] = ['admin', 'beneficiary', 'waqif', 'accountant'];

/** قراءة الدور من JWT app_metadata */
function getRoleFromSession(session: Session | null): AppRole | null {
  const metaRole = session?.user?.app_metadata?.user_role;
  if (metaRole && VALID_ROLES.includes(metaRole as AppRole)) {
    return metaRole as AppRole;
  }
  return null;
}

export interface AuthListenerState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  setRole: (role: AppRole | null) => void;
}

export function useAuthListener(): AuthListenerState {
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

        // محاولة قراءة الدور من JWT (فوري — لا await)
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

        // Fallback: fire-and-forget — لا await داخل onAuthStateChange
        logger.info('[Auth] role not in JWT, DB fallback');
        fetchRoleFallback(currentSession.user.id, currentSession.user.email);
      }
    );

    // Fallback: إذا لم يصدر INITIAL_SESSION (race condition)
    // NOTE: getSession مسموح هنا — client-side fallback فقط
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!isMounted) return;
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
          logger.info('[Auth] getSession fallback: no JWT role, fetching from DB');
          fetchRoleFallback(existingSession.user.id, existingSession.user.email);
        }
      } else if (!existingSession) {
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [setRoleWithRef]);

  return { user, session, role, loading, setRole: setRoleWithRef };
}
